/**
 * Admin Create User Edge Function
 * 
 * Secure Edge Function for creating users with role assignment.
 * Only accessible by master_admin users.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string;
  role: 'student' | 'admin' | 'org_admin' | 'staff';
  display_name?: string;
  password?: string; // Optional - if not provided, will generate temporary password
  org_id?: string; // Optional organization to attach the user to
  org_role?: 'org_admin' | 'staff' | 'student'; // Membership role within org
}

interface CreateUserResponse {
  success: boolean;
  user?: any;
  error?: string;
  temporaryPassword?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Initialize client Supabase to verify caller permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Set the session from the auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callingUser }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Verify caller is master admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single()

    if (roleError || !roleData || roleData.role !== 'master_admin') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Master admin privileges required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      )
    }

    // Parse request body
    const body: CreateUserRequest = await req.json()
    const { email, role, display_name, password, org_id, org_role } = body

    // Validate required fields
    if (!email || !role) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email and role are required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Validate role
    if (!['student', 'admin', 'org_admin', 'staff'].includes(role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid role specified' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Generate temporary password if not provided
    const userPassword = password || `temp_${Math.random().toString(36).slice(2, 12)}`

    // Create user via Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true, // Skip email confirmation for admin-created users
      user_metadata: {
        role,
        display_name: display_name || email.split('@')[0],
        created_by_admin: true
      }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user: ${createError.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User creation failed - no user returned' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Insert role into user_roles table
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: newUser.user.id,
        role: role,
        assigned_by: callingUser.id
      })

    if (roleInsertError) {
      // If role insertion fails, we should clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to assign role: ${roleInsertError.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Optionally create profile entry for legacy and set org_id
    if (display_name || org_id) {
      await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: newUser.user.id,
          display_name: display_name || email.split('@')[0],
          role: role === 'admin' ? 'admin' : 'student',
          org_id: org_id || null
        })
        .select()
    }

    // Optionally add org membership
    if (org_id) {
      const membershipRole = org_role || (role === 'org_admin' ? 'org_admin' : 'staff')
      const { error: membershipError } = await supabaseAdmin
        .from('memberships')
        .upsert({
          user_id: newUser.user.id,
          org_id,
          role: membershipRole as any
        })

      if (membershipError) {
        // Clean up created user if membership fails
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return new Response(
          JSON.stringify({ success: false, error: `Failed to add membership: ${membershipError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    const response: CreateUserResponse = {
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        role,
        display_name,
        created_at: newUser.user.created_at,
        ...(org_id ? { org_id, org_role: org_role || null } : {})
      },
      ...(password ? {} : { temporaryPassword: userPassword })
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
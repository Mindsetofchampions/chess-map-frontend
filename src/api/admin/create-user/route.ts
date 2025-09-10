/**
 * Admin Create User API Route
 * 
 * Server-side API route that calls the admin_create_user Edge Function
 * while keeping service role key secure.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Create user request interface
 */
interface CreateUserRequest {
  email: string;
  role: 'student' | 'admin' | 'org_admin' | 'staff';
  display_name?: string;
}

/**
 * POST /api/admin/create-user
 * 
 * Creates a new user via Supabase Edge Function while maintaining security
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CreateUserRequest = await request.json();
    const { email, role, display_name } = body;

    // Validate input
    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('admin_create_user', {
      body: { email, role, display_name }
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Create user API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
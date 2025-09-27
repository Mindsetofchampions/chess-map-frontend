import { Plus, Shield, Calendar, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import MapView from '@/components/MapView';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/contexts/AuthContext';
import { loadGoogleMapsPlaces } from '@/lib/googleMaps';
import { env } from '@/lib/env';
import { uploadQuestImage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

/**
 * MasterMap Tab
 * Shows all quests, safe spaces, and events in realtime and allows creation.
 */
export default function MasterMap() {
  const { role } = useAuth();
  const { showError, showSuccess } = useToast();
  const [quests, setQuests] = useState<any[]>([]);
  const [safeSpaces, setSafeSpaces] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [placeMode, setPlaceMode] = useState<null | 'quest' | 'safe' | 'event'>(null);

  // Creation form state
  type CreateType = 'quest' | 'safe' | 'event';
  const [createType, setCreateType] = useState<CreateType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Quest fields
  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qReward, setQReward] = useState<number>(5);
  const [qType, setQType] = useState<'text' | 'mcq' | 'numeric'>('mcq');
  const [qGradeBands, setQGradeBands] = useState<string[]>(['ES', 'MS', 'HS']);
  const [allGrades, setAllGrades] = useState<boolean>(true);
  const [qSeats, setQSeats] = useState<number>(1);
  const [qAttribute, setQAttribute] = useState<string | null>(null);
  // MCQ options
  const [mcqA, setMcqA] = useState('Option A');
  const [mcqB, setMcqB] = useState('Option B');
  const [mcqC, setMcqC] = useState('Option C');
  const [mcqCorrect, setMcqCorrect] = useState<'A' | 'B' | 'C'>('A');
  // Numeric constraints
  const [numMin, setNumMin] = useState<number>(0);
  const [numMax, setNumMax] = useState<number>(100);
  // Address/geocode
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [autoSuggests, setAutoSuggests] = useState<{ description: string; place_id: string }[]>([]);
  const [geocodeResults, setGeocodeResults] = useState<any[]>([]);
  const [pendingLoc, setPendingLoc] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);

  // Safe space fields
  const [sName, setSName] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sGrade, setSGrade] = useState<string | null>(null);
  const [sContact, setSContact] = useState<{ phone?: string; email?: string } | null>(null);

  // Event fields
  const [eTitle, setETitle] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eStartsAt, setEStartsAt] = useState<string>('');
  const [eEndsAt, setEEndsAt] = useState<string>('');

  // Simple attributes cache for quest attribute selection
  const [attributes, setAttributes] = useState<{ id: string; name: string }[]>([]);
  const [attrIdToName, setAttrIdToName] = useState<Record<string, string>>({});

  // Helper to extract lng/lat from heterogenous rows
  const extractLngLat = (row: any): { lng: number | null; lat: number | null } => {
    // Common fields
    let lng = row?.lng ?? row?.longitude ?? row?.lon ?? null;
    let lat = row?.lat ?? row?.latitude ?? null;
    // GeoJSON-like fallback
    if ((lng == null || lat == null) && row?.location?.coordinates?.length === 2) {
      const coords = row.location.coordinates;
      lng = coords[0];
      lat = coords[1];
    }
    // String to number coercion
    const toNum = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
    return { lng: toNum(lng), lat: toNum(lat) };
  };

  // Fetch all layers
  useEffect(() => {
    const load = async () => {
      try {
        const { data: q } = await supabase
          .from('quests')
          .select('*')
          .order('created_at', { ascending: false });
        setQuests(q || []);
      } catch (e) {}
      try {
        const { data: s } = await supabase.from('safe_spaces').select('*');
        setSafeSpaces(s || []);
      } catch (e) {}
      try {
        const { data: ev } = await supabase.from('events').select('*');
        setEvents(ev || []);
      } catch (e) {}
      try {
        // Load attributes for quest attribute selection (best-effort)
        const { data: attrs } = await supabase
          .from('attributes')
          .select('id,name')
          .order('name', { ascending: true });
        const rows = attrs || [];
        setAttributes(rows);
        const map: Record<string, string> = {};
        rows.forEach((r: any) => {
          if (r?.id && r?.name) map[r.id] = r.name as string;
        });
        setAttrIdToName(map);
      } catch {}
    };
    load();

    // Realtime: incrementally update state for snappy UI, with full reload fallback
    const ch = supabase
      .channel('master_map_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quests' }, (payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload || {};
        setQuests((prev) => {
          if (eventType === 'INSERT') {
            // Put newest first
            return [newRow, ...prev.filter((q) => q.id !== newRow?.id)];
          }
          if (eventType === 'UPDATE') {
            return prev.map((q) => (q.id === newRow?.id ? { ...q, ...newRow } : q));
          }
          if (eventType === 'DELETE') {
            return prev.filter((q) => q.id !== oldRow?.id);
          }
          return prev;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safe_spaces' }, (payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload || {};
        setSafeSpaces((prev) => {
          if (eventType === 'INSERT') return [newRow, ...prev.filter((r) => r.id !== newRow?.id)];
          if (eventType === 'UPDATE') return prev.map((r) => (r.id === newRow?.id ? { ...r, ...newRow } : r));
          if (eventType === 'DELETE') return prev.filter((r) => r.id !== oldRow?.id);
          return prev;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload || {};
        setEvents((prev) => {
          if (eventType === 'INSERT') return [newRow, ...prev.filter((r) => r.id !== newRow?.id)];
          if (eventType === 'UPDATE') return prev.map((r) => (r.id === newRow?.id ? { ...r, ...newRow } : r));
          if (eventType === 'DELETE') return prev.filter((r) => r.id !== oldRow?.id);
          return prev;
        });
      })
      .subscribe();

    // Focus-based refresh as a fallback if realtime misses events
    const onFocus = () => {
      load();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      try {
        ch.unsubscribe();
      } catch {}
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const renderOverlay = (map: any, gl?: any) => {
    if (!mapRef.current) {
      mapRef.current = map;
    }
    // add markers for each entity
    const markers: any[] = [];

    quests.forEach((q) => {
      const { lng, lat } = extractLngLat(q);
      if (lng !== null && lat !== null) {
        const el = document.createElement('div');
        el.className = 'quest-marker-master';
        // Color by attribute, fallback by status
        const attrName = q.attribute_id ? (attrIdToName[q.attribute_id] || '').toLowerCase() : '';
        const color = (() => {
          switch (attrName) {
            case 'character':
              return '#A855F7'; // purple
            case 'health':
              return '#EC4899'; // pink
            case 'exploration':
              return '#3B82F6'; // blue
            case 'stem':
              return '#F59E0B'; // amber
            case 'stewardship':
              return '#10B981'; // emerald
            default:
              return q.status === 'approved' ? '#10B981' : '#F59E0B';
          }
        })();
        el.style.cssText = `width: 20px;height: 20px;border-radius: 50%;background:${color};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.3);`;
        el.title = `${q.title} (${q.status})`;
        const GL = gl || (window as any).mapboxgl || (window as any).maplibregl;
        if (!GL?.Marker) return;
        markers.push(new GL.Marker(el).setLngLat([Number(lng), Number(lat)]).addTo(map));
      }
    });

    safeSpaces.forEach((s) => {
      const { lng, lat } = extractLngLat(s);
      if (lng !== null && lat !== null) {
        const el = document.createElement('div');
        el.className = 'safe-marker-master';
        el.style.cssText =
          'width: 18px;height: 18px;border-radius: 6px;background:#8B5CF6;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);';
        el.title = s.name || 'Safe Space';
        const GL = gl || (window as any).mapboxgl || (window as any).maplibregl;
        if (!GL?.Marker) return;
        markers.push(new GL.Marker(el).setLngLat([Number(lng), Number(lat)]).addTo(map));
      }
    });

    events.forEach((ev) => {
      const { lng, lat } = extractLngLat(ev);
      if (lng !== null && lat !== null) {
        const el = document.createElement('div');
        el.className = 'event-marker-master';
        el.style.cssText =
          'width: 18px;height: 18px;border-radius: 50%;background:#F43F5E;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);';
        el.title = ev.title || 'Event';
        const GL = gl || (window as any).mapboxgl || (window as any).maplibregl;
        if (!GL?.Marker) return;
        markers.push(new GL.Marker(el).setLngLat([Number(lng), Number(lat)]).addTo(map));
      }
    });

    // Click-to-place handler
    if (placeMode) {
      const clickHandler = async (e: any) => {
        const { lng, lat } = e.lngLat || {};
        if (lng == null || lat == null) return;
        setPendingLoc({ lat, lng });
        if (placeMode === 'quest') {
          await createQuest({
            lat,
            lng,
            title: qTitle || 'Master Quest',
            description: qDesc || 'Created by Master Map',
            reward_coins: qReward || 1,
            qtype: qType || 'mcq',
            grade_bands: (allGrades
              ? ['ES', 'MS', 'HS']
              : qGradeBands?.length
                ? qGradeBands
                : ['ES']) as string[],
            seats_total: qSeats || 1,
            attribute_id: qAttribute || undefined,
            image_url: uploadedUrl || undefined,
            config: buildQuestConfig(),
          });
        } else if (placeMode === 'safe') {
          await createSafeSpace({
            lat,
            lng,
            name: sName || 'Safe Space',
            description: sDesc || null,
            grade_level: sGrade || null,
            contact_info: {
              ...(sContact || {}),
              logo_url: uploadedUrl || undefined,
            },
          });
        } else if (placeMode === 'event') {
          await createEvent({
            lat,
            lng,
            title: eTitle || 'Event',
            description: eDesc || null,
            starts_at: eStartsAt || new Date().toISOString(),
            ends_at: eEndsAt || null,
            image_url: uploadedUrl || undefined,
          });
        }
        setPlaceMode(null);
        try {
          map.off('click', clickHandler);
        } catch {}
      };
      try {
        map.on('click', clickHandler);
      } catch {}
    }

    // Render-only function; cleanup is handled inline after click and on next render
    // Preview selected address/coords if present
    if (pendingLoc) {
      const el = document.createElement('div');
      el.className = 'preview-marker-master';
      el.style.cssText =
        'width: 22px;height: 22px;border-radius: 50%;background:#ffffff;border:3px solid #22d3ee;box-shadow:0 2px 10px rgba(0,0,0,0.4);';
      const GL = gl || (window as any).mapboxgl || (window as any).maplibregl;
      if (GL?.Marker) {
        markers.push(new GL.Marker(el).setLngLat([pendingLoc.lng, pendingLoc.lat]).addTo(map));
      }
    }
    return null;
  };

  const buildQuestConfig = () => {
    const base: any = { meta: { from: 'master_map', image_url: uploadedUrl || null } };
    if (qType === 'mcq') {
      return {
        ...base,
        options: [
          { id: 'A', text: mcqA },
          { id: 'B', text: mcqB },
          { id: 'C', text: mcqC },
        ],
        answer: mcqCorrect,
      };
    }
    if (qType === 'numeric') {
      return { ...base, numeric: { min: numMin, max: numMax } };
    }
    return { ...base, text: { maxLength: 1000 } };
  };

  // Quick create helpers
  const createQuest = async (payload: Partial<any>) => {
    try {
      // Ensure we pass a valid attribute_id by resolving one from attributes table if not provided
      let attributeId = payload.attribute_id as string | undefined;
      if (!attributeId) {
        const { data: attrs } = await supabase
          .from('attributes')
          .select('id,name')
          .order('name', { ascending: true })
          .limit(1);
        attributeId = attrs?.[0]?.id ?? null;
      }
      const { error } = await supabase.rpc('create_quest', {
        p_title: payload.title || 'Master Quest',
        p_description: payload.description || 'Created by Master Map',
        p_attribute_id: attributeId || null,
        p_reward_coins: payload.reward_coins || 1,
        p_qtype: payload.qtype || 'mcq',
        p_grade_bands: payload.grade_bands || ['ES', 'MS', 'HS'],
        p_seats_total: payload.seats_total || 1,
        p_lat: payload.lat || null,
        p_lng: payload.lng || null,
        p_config: payload.config || buildQuestConfig(),
      });
      if (error) throw error;
      showSuccess('Quest created');
      setPendingLoc(null);
    } catch (e: any) {
      showError('Create quest failed', e.message || String(e));
    }
  };

  const createSafeSpace = async (payload: Partial<any>) => {
    try {
      // Only include known columns; stash logo URL inside contact_info if provided
      const row: any = {
        name: payload.name || 'Safe Space',
        description: payload.description || null,
        grade_level: payload.grade_level || null,
        contact_info: payload.contact_info || (uploadedUrl ? { logo_url: uploadedUrl } : null),
        lat: payload.lat,
        lng: payload.lng,
        approved: true,
      };
      const { error } = await supabase.from('safe_spaces').insert(row);
      if (error) throw error;
      showSuccess('Safe space created');
    } catch (e: any) {
      showError('Create safe space failed', e.message || String(e));
    }
  };

  // Address autocomplete: query predictions while typing
  useEffect(() => {
    const API_KEY = env.get('VITE_GOOGLE_MAPS_API_KEY') as string | undefined;
    if (!API_KEY) return; // silent when not configured
    if (!address.trim()) {
      setAutoSuggests([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const google = await loadGoogleMapsPlaces(API_KEY);
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions({ input: address.trim() }, (preds: any[], status: string) => {
          if (!active) return;
          if (status === google.maps.places.PlacesServiceStatus.OK && Array.isArray(preds)) {
            setAutoSuggests(
              preds
                .slice(0, 6)
                .map((p: any) => ({ description: p.description, place_id: p.place_id })),
            );
          } else {
            setAutoSuggests([]);
          }
        });
      } catch (_) {
        // ignore
      } finally {
      }
    })();
    return () => {
      active = false;
    };
  }, [address]);

  async function geocodeAddress() {
    const API_KEY = env.get('VITE_GOOGLE_MAPS_API_KEY') as string | undefined;
    if (!address.trim()) return showError('Address required', 'Enter an address to search');
    if (!API_KEY)
      return showError('Missing API key', 'Set VITE_GOOGLE_MAPS_API_KEY to use geocoding');
    setGeocoding(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address.trim(),
      )}&key=${API_KEY}`;
      const resp = await fetch(url);
      const body = await resp.json();
      if (body.status !== 'OK' || !Array.isArray(body.results)) {
        throw new Error(body.error_message || 'No results');
      }
      const results = body.results.slice(0, 5);
      setGeocodeResults(results);
      const first = results[0];
      const loc = first?.geometry?.location;
      if (loc) {
        const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
        const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
        setPendingLoc({ lat, lng });
        try {
          mapRef.current?.flyTo?.({ center: [lng, lat], zoom: 15 });
        } catch {}
      }
    } catch (e: any) {
      showError('Geocode failed', e?.message || 'Unable to find address');
    } finally {
      setGeocoding(false);
    }
  }

  async function selectPlacePrediction(placeId: string, description: string) {
    const API_KEY = env.get('VITE_GOOGLE_MAPS_API_KEY') as string | undefined;
    if (!API_KEY) return;
    try {
      const google = await loadGoogleMapsPlaces(API_KEY);
      const tmpDiv = document.createElement('div');
      const placesSvc = new google.maps.places.PlacesService(tmpDiv);
      placesSvc.getDetails(
        { placeId, fields: ['geometry', 'formatted_address'] },
        (place: any, status: string) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            const loc = place.geometry.location;
            const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
            const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
            setAddress(place.formatted_address || description);
            setPendingLoc({ lat, lng });
            setAutoSuggests([]);
            try {
              mapRef.current?.flyTo?.({ center: [lng, lat], zoom: 15 });
            } catch {}
          }
        },
      );
    } catch (_) {
      // ignore
    }
  }

  const createEvent = async (payload: Partial<any>) => {
    try {
      // Insert only common fields that are known to exist
      const row: any = {
        title: payload.title || 'Event',
        description: payload.description || null,
        lat: payload.lat,
        lng: payload.lng,
        starts_at: payload.starts_at || new Date().toISOString(),
      };
      const { error } = await supabase.from('events').insert(row);
      if (error) throw error;
      showSuccess('Event created');
    } catch (e: any) {
      showError('Create event failed', e.message || String(e));
    }
  };

  // File upload helper (best-effort)
  const uploadLogo = async (file: File) => {
    try {
      setUploading(true);
      // Delegate to helper which sets metadata.uploader_id and returns public URL
      const url = await uploadQuestImage(file, createType || 'misc');
      setUploadedUrl(url || null);
      showSuccess('Image uploaded');
    } catch (e: any) {
      showError('Upload error', e.message || String(e));
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setUploadedUrl(null);
    setQTitle('');
    setQDesc('');
    setQReward(5);
    setQType('mcq');
    setQGradeBands(['ES', 'MS', 'HS']);
    setAllGrades(true);
    setQSeats(1);
    setQAttribute(null);
    setMcqA('Option A');
    setMcqB('Option B');
    setMcqC('Option C');
    setMcqCorrect('A');
    setNumMin(0);
    setNumMax(100);
    setAddress('');
    setGeocodeResults([]);
    setAutoSuggests([]);
    setPendingLoc(null);
    setSName('');
    setSDesc('');
    setSGrade(null);
    setSContact(null);
    setETitle('');
    setEDesc('');
    setEStartsAt('');
    setEEndsAt('');
  };

  if (role !== 'master_admin') {
    return <div className='text-white/80 text-sm'>Master admin access required to view map.</div>;
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2 items-center'>
        <button
          className={`px-3 py-2 rounded flex items-center gap-2 ${createType === 'quest' && showForm ? 'bg-electric-blue-600 text-white' : 'bg-white/10'}`}
          onClick={() => {
            setCreateType('quest');
            setShowForm(true);
            setPlaceMode(null);
          }}
        >
          <Plus className='w-4 h-4' /> New Quest
        </button>
        <button
          className={`px-3 py-2 rounded flex items-center gap-2 ${createType === 'safe' && showForm ? 'bg-violet-700 text-white' : 'bg-white/10'}`}
          onClick={() => {
            setCreateType('safe');
            setShowForm(true);
            setPlaceMode(null);
          }}
        >
          <Shield className='w-4 h-4' /> New Safe Space
        </button>
        <button
          className={`px-3 py-2 rounded flex items-center gap-2 ${createType === 'event' && showForm ? 'bg-rose-700 text-white' : 'bg-white/10'}`}
          onClick={() => {
            setCreateType('event');
            setShowForm(true);
            setPlaceMode(null);
          }}
        >
          <Calendar className='w-4 h-4' /> New Event
        </button>
        {placeMode && (
          <div className='text-sm text-gray-200 ml-2'>
            Tip: click on the map to place the {placeMode}. Press ESC to cancel.
          </div>
        )}
      </div>
      {showForm && (
        <div className='rounded-xl bg-white/5 border border-white/10 p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <div className='text-white font-semibold'>Create {createType}</div>
            <button
              className='text-white/70 hover:text-white'
              onClick={() => {
                setShowForm(false);
                setCreateType(null);
                resetForm();
              }}
            >
              <X className='w-5 h-5' />
            </button>
          </div>
          {/* Shared logo upload */}
          <div className='grid md:grid-cols-3 gap-3 items-end'>
            <div className='md:col-span-2'>
              <label className='block text-xs text-gray-300 mb-1'>Logo/Image (optional)</label>
              <div className='flex items-center gap-3'>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadLogo(f);
                  }}
                  className='block w-full text-sm text-gray-200 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20'
                />
                {uploadedUrl && (
                  <img
                    src={uploadedUrl}
                    alt='preview'
                    className='w-12 h-12 rounded object-cover border border-white/20'
                  />
                )}
              </div>
              {uploading && <div className='text-xs text-gray-400 mt-1'>Uploading...</div>}
            </div>
            <div className='text-right'>
              <button
                disabled={placeMode != null}
                className={`px-3 py-2 rounded ${placeMode ? 'bg-white/10 text-white/60' : 'bg-white/20 text-white hover:bg-white/30'}`}
                onClick={() => {
                  // Enter place mode after basic validation
                  if (createType === 'quest') {
                    if (!qTitle.trim())
                      return showError('Missing title', 'Please enter a quest title.');
                  } else if (createType === 'safe') {
                    if (!sName.trim())
                      return showError('Missing name', 'Please enter a safe space name.');
                  } else if (createType === 'event') {
                    if (!eTitle.trim())
                      return showError('Missing title', 'Please enter an event title.');
                  }
                  setPlaceMode(createType);
                  showSuccess('Placement mode', 'Click on the map to place the item.');
                }}
              >
                Next: Click map to place
              </button>
            </div>
          </div>

          {/* Type-specific fields */}
          {createType === 'quest' && (
            <div className='grid md:grid-cols-3 gap-3'>
              <div>
                <label htmlFor='q-title' className='block text-xs text-gray-300 mb-1'>
                  Title
                </label>
                <input
                  id='q-title'
                  value={qTitle}
                  onChange={(e) => setQTitle(e.target.value)}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Reward Coins</label>
                <input
                  type='number'
                  value={qReward}
                  onChange={(e) => setQReward(parseInt(e.target.value || '0', 10))}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Type</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as any)}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                >
                  <option value='mcq'>MCQ</option>
                  <option value='text'>Text</option>
                  <option value='numeric'>Numeric</option>
                </select>
              </div>
              <div className='md:col-span-3'>
                <label className='block text-xs text-gray-300 mb-1'>Description</label>
                <textarea
                  value={qDesc}
                  onChange={(e) => setQDesc(e.target.value)}
                  rows={2}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Grade Bands</label>
                <div className='space-y-2'>
                  <select
                    multiple
                    value={qGradeBands as any}
                    onChange={(e) => {
                      const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                      setQGradeBands(vals);
                      setAllGrades(vals.length === 3);
                    }}
                    className='w-full bg-white/10 rounded px-3 py-2 text-white'
                  >
                    <option value='ES'>ES</option>
                    <option value='MS'>MS</option>
                    <option value='HS'>HS</option>
                  </select>
                  <label className='flex items-center gap-2 text-gray-200 text-xs'>
                    <input
                      type='checkbox'
                      checked={allGrades}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setAllGrades(v);
                        setQGradeBands(
                          v ? ['ES', 'MS', 'HS'] : qGradeBands.length ? qGradeBands : ['ES'],
                        );
                      }}
                    />
                    Apply to all grades (ES, MS, HS)
                  </label>
                </div>
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Seats Total</label>
                <input
                  type='number'
                  value={qSeats}
                  onChange={(e) => setQSeats(parseInt(e.target.value || '1', 10))}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Attribute</label>
                <select
                  value={qAttribute || ''}
                  onChange={(e) => setQAttribute(e.target.value || null)}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                >
                  <option value=''>Auto-pick</option>
                  {attributes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Address search and placement */}
              <div className='md:col-span-3'>
                <label className='block text-xs text-gray-300 mb-1'>Address (optional)</label>
                <div className='grid md:grid-cols-[1fr_auto_auto] gap-2'>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder='Enter address or place name'
                    className='w-full bg-white/10 rounded px-3 py-2 text-white'
                  />
                  <button
                    className='px-3 py-2 rounded bg-white/20 text-white hover:bg-white/30'
                    onClick={async () => {
                      await geocodeAddress();
                    }}
                    disabled={geocoding}
                  >
                    {geocoding ? 'Finding…' : 'Find'}
                  </button>
                  <button
                    className='px-3 py-2 rounded bg-electric-blue-600 text-white disabled:opacity-50'
                    disabled={!pendingLoc || placeMode != null}
                    onClick={async () => {
                      if (!pendingLoc) return;
                      await createQuest({
                        lat: pendingLoc.lat,
                        lng: pendingLoc.lng,
                        title: qTitle || 'Master Quest',
                        description: qDesc || 'Created by Master Map',
                        reward_coins: qReward || 1,
                        qtype: qType || 'mcq',
                        grade_bands: (allGrades
                          ? ['ES', 'MS', 'HS']
                          : qGradeBands?.length
                            ? qGradeBands
                            : ['ES']) as string[],
                        seats_total: qSeats || 1,
                        attribute_id: qAttribute || undefined,
                        image_url: uploadedUrl || undefined,
                        config: buildQuestConfig(),
                      });
                    }}
                  >
                    Place at address
                  </button>
                </div>
                {!!autoSuggests.length && (
                  <div className='mt-2 bg-black/20 border border-white/10 rounded-xl p-2 max-h-40 overflow-auto'>
                    {autoSuggests.map((s) => (
                      <button
                        key={s.place_id}
                        className='block w-full text-left text-sm text-gray-200 hover:bg-white/10 rounded px-2 py-1'
                        onClick={() => selectPlacePrediction(s.place_id, s.description)}
                      >
                        {s.description}
                      </button>
                    ))}
                  </div>
                )}
                {!!geocodeResults.length && (
                  <div className='mt-2 bg-black/20 border border-white/10 rounded-xl p-2 max-h-40 overflow-auto'>
                    {geocodeResults.map((r, i) => (
                      <button
                        key={i}
                        className='block w-full text-left text-sm text-gray-200 hover:bg-white/10 rounded px-2 py-1'
                        onClick={() => {
                          const loc = r.geometry?.location;
                          if (loc) {
                            const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
                            const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
                            setPendingLoc({ lat, lng });
                            setAddress(r.formatted_address || address);
                            try {
                              mapRef.current?.flyTo?.({ center: [lng, lat], zoom: 15 });
                            } catch {}
                          }
                        }}
                      >
                        {r.formatted_address || 'Unknown address'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Type-specific inputs */}
              {qType === 'mcq' && (
                <div className='md:col-span-3 grid md:grid-cols-4 gap-3'>
                  <div>
                    <label className='block text-xs text-gray-300 mb-1'>Option A</label>
                    <input
                      value={mcqA}
                      onChange={(e) => setMcqA(e.target.value)}
                      className='w-full bg-white/10 rounded px-3 py-2 text-white'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-300 mb-1'>Option B</label>
                    <input
                      value={mcqB}
                      onChange={(e) => setMcqB(e.target.value)}
                      className='w-full bg-white/10 rounded px-3 py-2 text-white'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-300 mb-1'>Option C</label>
                    <input
                      value={mcqC}
                      onChange={(e) => setMcqC(e.target.value)}
                      className='w-full bg-white/10 rounded px-3 py-2 text-white'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-300 mb-1'>Correct</label>
                    <select
                      value={mcqCorrect}
                      onChange={(e) => setMcqCorrect(e.target.value as any)}
                      className='w-full bg-white/10 rounded px-3 py-2 text-white'
                    >
                      <option value='A'>A</option>
                      <option value='B'>B</option>
                      <option value='C'>C</option>
                    </select>
                  </div>
                </div>
              )}
              {qType === 'numeric' && (
                <div className='md:col-span-3 grid md:grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-xs text-gray-300 mb-1'>Minimum</label>
                    <input
                      type='number'
                      value={numMin}
                      onChange={(e) => setNumMin(parseFloat(e.target.value || '0'))}
                      className='w-full bg-white/10 rounded px-3 py-2 text-white'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-300 mb-1'>Maximum</label>
                    <input
                      type='number'
                      value={numMax}
                      onChange={(e) => setNumMax(parseFloat(e.target.value || '0'))}
                      className='w-full bg-white/10 rounded px-3 py-2 text-white'
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {createType === 'safe' && (
            <div className='grid md:grid-cols-3 gap-3'>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Name</label>
                <input
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Grade Level</label>
                <select
                  value={sGrade || ''}
                  onChange={(e) => setSGrade(e.target.value || null)}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                >
                  <option value=''>All</option>
                  <option value='ES'>ES</option>
                  <option value='MS'>MS</option>
                  <option value='HS'>HS</option>
                </select>
              </div>
              <div className='md:col-span-3'>
                <label className='block text-xs text-gray-300 mb-1'>Description</label>
                <textarea
                  value={sDesc}
                  onChange={(e) => setSDesc(e.target.value)}
                  rows={2}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                />
              </div>
              <div className='md:col-span-3'>
                <label className='block text-xs text-gray-300 mb-1'>Contact (optional)</label>
                <div className='grid md:grid-cols-2 gap-2'>
                  <input
                    placeholder='Phone'
                    onChange={(e) => setSContact({ ...(sContact || {}), phone: e.target.value })}
                    className='w-full bg-white/10 rounded px-3 py-2 text-white'
                  />
                  <input
                    placeholder='Email'
                    onChange={(e) => setSContact({ ...(sContact || {}), email: e.target.value })}
                    className='w-full bg-white/10 rounded px-3 py-2 text-white'
                  />
                </div>
              </div>
            </div>
          )}
          {createType === 'event' && (
            <div className='grid md:grid-cols-3 gap-3'>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Title</label>
                <input
                  value={eTitle}
                  onChange={(e) => setETitle(e.target.value)}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Starts At</label>
                <input
                  type='datetime-local'
                  value={eStartsAt}
                  onChange={(e) => setEStartsAt(e.target.value)}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Ends At (optional)</label>
                <input
                  type='datetime-local'
                  value={eEndsAt}
                  onChange={(e) => setEEndsAt(e.target.value)}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                />
              </div>
              <div className='md:col-span-3'>
                <label className='block text-xs text-gray-300 mb-1'>Description</label>
                <textarea
                  value={eDesc}
                  onChange={(e) => setEDesc(e.target.value)}
                  rows={2}
                  className='w-full bg-white/10 rounded px-3 py-2 text-white'
                />
              </div>
            </div>
          )}
        </div>
      )}
      {placeMode && <EscCatcher onEsc={() => setPlaceMode(null)} />}
      <div className='rounded-xl overflow-hidden' style={{ minHeight: 500 }}>
        <MapView renderOverlay={renderOverlay} />
      </div>
    </div>
  );
}

// Helper component to handle global ESC key cancel
function EscCatcher({ onEsc }: { onEsc: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEsc();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onEsc]);
  return null;
}

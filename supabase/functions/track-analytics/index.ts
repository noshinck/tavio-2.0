import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Secure Server Key
    )

    const { card_uid, type, title } = await req.json()

    // 1. Validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!card_uid || !uuidRegex.test(card_uid)) {
      return new Response(JSON.stringify({ error: 'Invalid card_uid' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 2. Tracking logic
    let result;
    if (type === 'visit') {
      result = await supabase.from('card_scans').insert({
        card_uid,
        method: 'direct',
        device: req.headers.get('user-agent'),
        scanned_at: new Date().toISOString()
      })
    } else {
      result = await supabase.from('link_clicks').insert({
        card_uid,
        link_title: title,
        device: req.headers.get('user-agent'),
        clicked_at: new Date().toISOString()
      })
    }

    if (result.error) throw result.error

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})

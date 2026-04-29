import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { key } = await req.json()

    if (!key) {
      return new Response(JSON.stringify({ error: '密钥不能为空' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminKey = Deno.env.get('ADMIN_KEY')

    if (!adminKey || adminKey === 'default-key-change-me') {
      return new Response(JSON.stringify({ error: '服务器未配置密钥' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (key === adminKey) {
      // 创建 Supabase 服务角色客户端
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 生成随机 session token
      const sessionToken = crypto.randomUUID()

      // 将 token 存入数据库
      const { error: insertError } = await supabaseAdmin
        .from('admin_sessions')
        .insert({
          session_token: sessionToken,
          role: 'editor',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })

      if (insertError) {
        console.error('创建 session 失败:', insertError)
        return new Response(JSON.stringify({
          success: true,
          role: 'editor',
          message: '验证成功（session 创建失败，请刷新页面重试）'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        success: true,
        role: 'editor',
        token: sessionToken,
        message: '验证成功'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: false,
      error: '密钥错误'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('处理错误:', err)
    return new Response(JSON.stringify({ error: '请求处理失败' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

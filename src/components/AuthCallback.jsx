import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenHash = urlParams.get('token');
        const type = urlParams.get('type');
        const redirectTo = urlParams.get('redirect_to') || '/';

        if (!tokenHash || !type) {
          console.error('缺少验证参数');
          navigate('/');
          return;
        }

        let result;
        if (type === 'signup' || type === 'email_change') {
          result = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type
          });
        } else if (type === 'recovery') {
          result = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });
        } else if (type === 'magiclink') {
          result = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink'
          });
        }

        if (result?.error) {
          console.error('验证失败:', result.error);
          alert('验证失败: ' + result.error.message);
          navigate('/');
          return;
        }

        if (result?.data?.session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', result.data.session.user.id)
            .single();

          if (!profile) {
            const username = result.data.session.user.user_metadata?.username || 
                           result.data.session.user.email.split('@')[0];
            
            const { error: profileError } = await supabase
              .from('profiles')
              .insert([{
                id: result.data.session.user.id,
                username: username,
                role: 'viewer'
              }]);

            if (profileError) {
              console.error('创建profile失败:', profileError);
            }
          }

          alert('验证成功！欢迎登录');
          navigate(redirectTo);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('验证过程出错:', error);
        alert('验证过程出错，请重试');
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px',
      color: '#666'
    }}>
      正在验证邮箱，请稍候...
    </div>
  );
}

export default AuthCallback;

import React, { useRef, useEffect, useState, useCallback } from 'react';

function CaptchaCanvas({ onVerify, length = 4 }) {
  const canvasRef = useRef(null);
  const [captchaCode, setCaptchaCode] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const generateCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }, [length]);

  const drawCaptcha = useCallback((code) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);

    // 绘制干扰线
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // 绘制干扰点
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.6)`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 绘制文字
    const fontSize = 28;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'middle';

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const x = (width / (length + 1)) * (i + 1);
      const y = height / 2 + (Math.random() - 0.5) * 10;
      const angle = (Math.random() - 0.5) * 0.6;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = `rgb(${Math.random() * 100 + 50}, ${Math.random() * 100 + 50}, ${Math.random() * 100 + 50})`;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, [length]);

  const refreshCaptcha = useCallback(() => {
    const newCode = generateCode();
    setCaptchaCode(newCode);
    setInputValue('');
    setError('');
    onVerify(false);
  }, [generateCode, onVerify]);

  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  useEffect(() => {
    drawCaptcha(captchaCode);
  }, [captchaCode, drawCaptcha]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.length === length) {
      if (value.toLowerCase() === captchaCode.toLowerCase()) {
        setError('');
        onVerify(true);
      } else {
        setError('验证码错误');
        onVerify(false);
      }
    } else {
      setError('');
      onVerify(false);
    }
  };

  return (
    <div className="captcha-container">
      <div className="captcha-row">
        <canvas
          ref={canvasRef}
          width={140}
          height={44}
          className="captcha-canvas"
        />
        <button
          type="button"
          className="captcha-refresh-btn"
          onClick={refreshCaptcha}
          title="刷新验证码"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>
      <input
        type="text"
        className={`captcha-input ${error ? 'captcha-error' : ''}`}
        value={inputValue}
        onChange={handleInputChange}
        placeholder="请输入验证码"
        maxLength={length}
      />
      {error && <span className="captcha-error-text">{error}</span>}
    </div>
  );
}

export default CaptchaCanvas;

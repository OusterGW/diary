let db = null;

function loadScript(src, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    const timer = setTimeout(() => {
      s.remove();
      reject(new Error('Таймаут загрузки скрипта'));
    }, timeoutMs);
    s.src = src;
    s.onload = () => { clearTimeout(timer); resolve(); };
    s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error('Ошибка сети')); };
    document.head.appendChild(s);
  });
}

async function ensureSupabase() {
  if (window.supabase?.createClient) return;
  const cdns = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];
  for (const url of cdns) {
    try {
      await loadScript(url, 6000);
      if (window.supabase?.createClient) return;
    } catch (e) {}
  }
  throw new Error('Не удалось загрузить библиотеку Supabase. Проверьте интернет или VPN.');
}

function withTimeout(promise, ms, errText) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errText)), ms))
  ]);
}

function compressImage(file, maxSide = 1280, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        if (width >= height) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Не удалось сжать фото')),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = url;
  });
}
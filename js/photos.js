export const PHOTO_INPUT_LIMIT = 4_000_000;
export const PHOTO_LIMIT = 666664;
export const PHOTO_BYTES_LIMIT = 500_000;

export function photoDimensions(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw Error('Dimensões inválidas.');
  const scale = Math.min(1, 1920 / Math.max(width,height), 1080 / Math.min(width,height));
  return {width: Math.max(1, Math.round(width*scale)), height: Math.max(1, Math.round(height*scale))};
}

export function validatePhotoFile(file) {
  if (!file || !/^image\/(jpeg|png|webp|gif|avif|bmp|heic|heif)$/i.test(file.type) || !Number.isFinite(file.size) || file.size <= 0) throw Error('Selecione uma imagem válida (JPEG, PNG ou WebP recomendado).');
  if (file.size > PHOTO_INPUT_LIMIT) throw Error('A foto original deve ter até 4 MB.');
}

async function decodePhoto(file) {
  if (typeof createImageBitmap === 'function') {
    try { const bitmap = await createImageBitmap(file); return {image:bitmap,width:bitmap.width,height:bitmap.height,release:()=>bitmap.close()}; } catch {}
  }
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
    return {image,width:image.naturalWidth,height:image.naturalHeight,release:()=>URL.revokeObjectURL(url)};
  } catch { URL.revokeObjectURL(url); throw Error('Não foi possível abrir a imagem. Tente JPEG ou PNG.'); }
}

export function decodedBytes(base64) {
  return Math.floor(base64.length*3/4)-(base64.endsWith('==')?2:base64.endsWith('=')?1:0);
}

export async function preparePhoto(file) {
  validatePhotoFile(file);
  const decoded=await decodePhoto(file);
  let canvas;
  try {
    canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('O navegador não suporta compressão de imagem.');
    const initial=photoDimensions(decoded.width,decoded.height);
    let scale=1;
    for(let pass=0;pass<12;pass++){
      canvas.width=Math.max(1,Math.round(initial.width*scale));
      canvas.height=Math.max(1,Math.round(initial.height*scale));
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(decoded.image,0,0,canvas.width,canvas.height);
      for(const quality of [.92,.88,.84,.80,.76,.70,.64,.58,.52]){
        const url=canvas.toDataURL('image/jpeg',quality);
        const base64=url.startsWith('data:image/jpeg;base64,')?url.slice(23):'';
        if(base64.startsWith('/9j/')&&base64.length<=PHOTO_LIMIT&&decodedBytes(base64)<=PHOTO_BYTES_LIMIT)return {base64,width:canvas.width,height:canvas.height};
      }
      scale*=.82;
    }
    throw Error('Não foi possível comprimir a foto para até 500 KB. Tente outra imagem.');
  } finally {decoded.release();if(canvas)canvas.width=canvas.height=1;}
}

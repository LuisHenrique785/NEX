import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  onScanned: (code: string) => void;
  onClose: () => void;
  count: number;
  lastScanned: string;
  recentCodes?: string[];
}

export function WebScanner({ onScanned, onClose, count, lastScanned, recentCodes }: Props) {
  const videoRef = useRef<any>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const cooldown = useRef(false);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    // Stop existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(rafRef.current);

    try {
      const stream = await (navigator as any).mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const video = videoRef.current as HTMLVideoElement | null;
      if (video) {
        video.srcObject = stream;
        await video.play();

        // Apply continuous autofocus if supported
        const track = stream.getVideoTracks()[0] as any;
        const caps = track.getCapabilities?.();
        if (caps?.focusMode?.includes('continuous')) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        }
      }

      scan();
    } catch (e: any) {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  }, []);

  function scan() {
    const video = videoRef.current as HTMLVideoElement | null;
    if (!detectorRef.current || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }
    detectorRef.current
      .detect(video)
      .then((results: any[]) => {
        if (results.length > 0 && !cooldown.current) {
          cooldown.current = true;
          onScanned(results[0].rawValue);
          setTimeout(() => { cooldown.current = false; }, 1500);
        }
      })
      .catch(() => {})
      .finally(() => {
        rafRef.current = requestAnimationFrame(scan);
      });
  }

  useEffect(() => {
    const BD = (window as any).BarcodeDetector;
    if (!BD) {
      setError('Seu navegador não suporta leitura automática de código.\nUse a entrada manual (⌨️).');
      return;
    }
    detectorRef.current = new BD({
      formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix', 'itf'],
    });
    startCamera('environment');

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontSize: 15, lineHeight: 24, marginBottom: 28 }}>{error}</Text>
        <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#FFE600', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}>
          <Text style={{ fontWeight: '800', fontSize: 15 }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {React.createElement('video', {
        ref: videoRef,
        style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
        playsInline: true,
        muted: true,
        autoPlay: true,
      })}

      {/* Overlay */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>✓ Feito ({count})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={flipCamera} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔄 Câmera</Text>
          </TouchableOpacity>
        </View>

        {/* Scan frame */}
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 260, height: 160, position: 'relative' }}>
            {[
              { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
              { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
              { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
              { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
            ].map((s, i) => (
              <View key={i} style={[{ position: 'absolute', width: 30, height: 30, borderColor: '#FFE600', borderWidth: 3 }, s as any]} />
            ))}
          </View>
        </View>

        {/* Result / hint */}
        <View style={{ paddingBottom: 32 }}>
          {lastScanned ? (
            <View style={{
              alignSelf: 'center',
              backgroundColor: lastScanned.startsWith('⚠️') ? '#FB8C00' : '#43A047',
              paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, marginBottom: 8,
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>{lastScanned}</Text>
            </View>
          ) : (
            <View style={{ alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginBottom: 8 }}>
              <Text style={{ color: '#ddd', fontSize: 13 }}>Aponte para o código de barras</Text>
            </View>
          )}

          {recentCodes && recentCodes.length > 0 && (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>Na lista ({count}):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recentCodes.slice(0, 8).map((code, i) => (
                  <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'monospace' }}>{code.slice(-8)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

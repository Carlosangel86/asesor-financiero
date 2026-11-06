// ===== PANTALLA SPLASH DE ANIMACIÓN PROCAÑA MOTORS =====
// Reproduce el video a pantalla completa total (100% viewport) sin elementos sobrepuestos
// Duración exacta: 6 segundos (segundos 14 al 20 del clip original)

(function(){
    let dismissed = false;

    window.dismissSplash = function(){
        if(dismissed) return;
        dismissed = true;
        const splash = document.getElementById('procana-splash-screen');
        const video = document.getElementById('procana-splash-video');
        if(video){
            try { video.pause(); } catch(e){}
        }
        if(splash){
            splash.style.transition = 'opacity 0.6s ease-out';
            splash.style.opacity = '0';
            splash.style.pointerEvents = 'none';
            setTimeout(() => {
                try { splash.remove(); } catch(e){}
            }, 650);
        }
    };

    function initSplash(){
        const splash = document.getElementById('procana-splash-screen');
        if(!splash) return;

        // Omitir splash si el usuario reinició estando en Asesoría Financiera o Punto de Venta
        try {
            const lastView = sessionStorage.getItem('procana_last_view');
            if (lastView === 'advisor' || lastView === 'pos') {
                splash.remove();
                return;
            }
        } catch(e){}

        const video = document.getElementById('procana-splash-video');
        if(!video) return;

        // Permitir clic en cualquier parte de la pantalla o presionar cualquier tecla para entrar inmediatamente
        splash.addEventListener('click', window.dismissSplash);
        window.addEventListener('keydown', function onKey(e){
            window.dismissSplash();
            window.removeEventListener('keydown', onKey);
        });

        // Al finalizar los 6 segundos de animación, desvanecer e ingresar al sistema
        video.addEventListener('ended', window.dismissSplash);

        // Fallback cuando se acerque al final de la reproducción
        video.addEventListener('timeupdate', () => {
            if(!dismissed && video.duration && (video.duration - video.currentTime <= 0.1)){
                window.dismissSplash();
            }
        });

        // Intentar reproducción automática (muted permite reproducción inmediata según políticas del navegador)
        const playPromise = video.play();
        if(playPromise !== undefined){
            playPromise.catch(err => {
                console.warn('[Splash autoplay warning]', err);
                // Si el navegador bloquea autoplay, un clic en cualquier parte inicia o descarta
                splash.addEventListener('click', () => {
                    video.play().catch(window.dismissSplash);
                }, { once: true });
            });
        }
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', initSplash);
    } else {
        initSplash();
    }
})();

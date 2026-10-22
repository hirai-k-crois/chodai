// スマホGPS：現在地表示・追従
$(function () {
    const map = window.map;
    if (!map) return;

    let watchId = null;
    let locationMarker = null;
    let accuracyCircle = null;
    let following = false;

    const LocationControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar cst-location-control');
            const button = L.DomUtil.create('a', 'cst-location-btn', container);
            button.href = '#';
            button.title = '現在地を表示／追従';
            button.setAttribute('role', 'button');
            button.setAttribute('aria-label', '現在地を表示／追従');
            button.innerHTML = '<span class="cst-location-symbol">●</span><span class="cst-location-text">現在地</span>';

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            L.DomEvent.on(button, 'click', function (e) {
                L.DomEvent.preventDefault(e);
                toggleLocation(button);
            });
            return container;
        }
    });

    map.addControl(new LocationControl());

    function toggleLocation(button) {
        if (!navigator.geolocation) {
            alert('この端末／ブラウザは位置情報取得に対応していません。');
            return;
        }

        if (following) {
            following = false;
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            watchId = null;
            button.classList.remove('active');
            button.title = '現在地を表示／追従';
            return;
        }

        following = true;
        button.classList.add('active');
        button.title = '現在地の追従を停止';

        watchId = navigator.geolocation.watchPosition(
            function (pos) {
                const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
                const accuracy = pos.coords.accuracy || 0;

                if (!locationMarker) {
                    locationMarker = L.circleMarker(latlng, {
                        radius: 8,
                        weight: 3,
                        color: '#ffffff',
                        fillColor: '#1677ff',
                        fillOpacity: 1,
                        interactive: false
                    }).addTo(map);
                    locationMarker.bindTooltip('現在地', { permanent: false, direction: 'top' });
                } else {
                    locationMarker.setLatLng(latlng);
                }

                if (!accuracyCircle) {
                    accuracyCircle = L.circle(latlng, {
                        radius: accuracy,
                        weight: 1,
                        color: '#1677ff',
                        fillColor: '#1677ff',
                        fillOpacity: 0.12,
                        interactive: false
                    }).addTo(map);
                } else {
                    accuracyCircle.setLatLng(latlng);
                    accuracyCircle.setRadius(accuracy);
                }

                locationMarker.bringToFront();
                if (following) map.setView(latlng, Math.max(map.getZoom(), 17));
            },
            function (err) {
                following = false;
                button.classList.remove('active');
                if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                watchId = null;

                let msg = '現在地を取得できませんでした。';
                if (err.code === 1) msg += '\nブラウザの位置情報を「許可」にしてください。';
                else if (err.code === 2) msg += '\nGPSまたは位置情報サービスを確認してください。';
                else if (err.code === 3) msg += '\n位置情報の取得がタイムアウトしました。';
                if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                    msg += '\n※スマホではHTTPSでの公開が必要です。';
                }
                alert(msg);
            },
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
        );
    }
});

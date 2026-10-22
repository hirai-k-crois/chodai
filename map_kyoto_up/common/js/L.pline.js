(function () {
    L.PLine = L.CircleMarker.extend({
        initialize: function (latlng, latlng2, options, popupOptions, lineOptions) {

            this._popupOptions = popupOptions;

            // popup line
            this._line = L.polyline([], { color: 'red', opacity: 0.6, weight: 4 });

            // 元の線設定を保存
            this._lineOptions = L.extend({}, lineOptions || {});

            // 点滅用タイマー
            this._blinkTimer = null;

            this._polyline2 = L.polyline(
                [latlng, latlng2],
                this._lineOptions
            );

            L.CircleMarker.prototype.initialize.call(this, latlng, options);
        },
        _movePopup: function () {
            // L.CircleMarkerの処理を無効化
        },
        onAdd: function (map2) {
            L.CircleMarker.prototype.onAdd.call(this, map2);

            // 線の表示
            this._polyline2.addTo(map2);
            this._line.addTo(map2);

            // ポップアップを消さない
            this.on({
                move: function (e) {
                    this._popup2.setLatLng(e.latlng);
                    this._updateLine();
                }, click: function (e) {

                    if (this._popup2) {
                        if (!this._popup2.isOpen()) {
                            this.openPopup2();
                        } else {
                            this.closePopup2();
                        }
                    }
                }
            });

            // click
            const self = this;
            this._polyline2.on('click', function (e) {
                self.openPopup2();
                self.blinkLine();
            });

            // ドラッグイベント ( 線の更新 ) 
            map2.on("zoomend", function (e) {
                this._updateLine();
            }, this);
            map2.on("zoomstart", function (e) {
                this._hiddenLine();
            }, this);
            map2.on("popupclose", function (e) {
                if (e.popup._leaflet_id == this._popup2._leaflet_id) {
                    this._hiddenLine();
                }
            }, this);
            map2.on("popupopen", function (e) {
                if (e.popup._leaflet_id == this._popup2._leaflet_id) {
                    this._updateLine();
                }
            }, this);

            // ポップアップの追加
            this._addPopup2();

            // 線の追加
            this._updateLine();

            return this;
        },
        _addPopup2: function () {
            if (!(this._popup2 instanceof L.Popup)) {
                // ポップアップの追加
                const options = L.extend({
                    closeOnClick: false,
                    className: "pmarker",
                    autoPan: false
                }, this._popupOptions);

                this._popup2 = L.popup(options)
                    .setLatLng(this.getLatLng())
                    .setContent(this.options.popup);
                this._popup2.size = {};
                this._popup2.size_origin = {};
            }
            return this;
        },
        _hiddenLine: function () {
            if (this._line instanceof L.Polyline) {
                this._line.setLatLngs([]);
            }
        },
        // ポップアップのオフセットの取得
        _getPopupOffset: function () {
            let p2;

            const pos = this.getLatLng();
            const p1 = this._map.latLngToLayerPoint(pos);

            const $p = $(this._popup2._container);
            p2 = $p.position();
            p2 = L.point(p2.left, p2.top);

            const w = $p.width();
            const h = $p.height();

            p2 = p2.add([w / 2, h]);

            return p2.subtract(p1);
        },
        // ポップアップのオフセットの取得
        _getPopupOffsetOrigin: function () {
            let p2;
            const pos = this.getLatLng();
            const p1 = this._map.latLngToLayerPoint(pos);

            const $p = $(this._popup2._container);
            p2 = $p.position();
            p2 = L.point(p2.left, p2.top);

            const w = this._popup2.size_origin.w || 0;
            const h = $p.height();

            p2 = p2.add([w / 2, h]);

            return p2.subtract(p1);
        },
        // 線を引く
        _updateLine: function () {
            if (this._popup2.isOpen()) {
                // マーカーの位置
                const pos1 = this.getLatLng();
                const offset = this._getPopupOffset();
                offset.y -= $(this._popup2._container).height() / 2;
                const pos2 = this._map.unproject(this._map.project(pos1).add(offset));
                this._line.setLatLngs([pos1, pos2]);
            } else {
                this._hiddenLine();
            }
        },
        togglePopup2: function () {
            if (this._popup2.isOpen()) {
                this.closePopup2();
            } else {
                this.openPopup2();
            }
        },
        closePopup2: function () {
            if (this._popup2.isOpen()) {
                const os = this._popup2.options.offset;

                // 削除
                this._popup = this._popup2;
                L.CircleMarker.prototype.closePopup.call(this);
                this._popup = null;

                // offsetを復元する
                this._popup2.options.offset = os;
            }
            return this;
        },
        openPopup2: function () {

            if (!this._map) {
                return false;
            }
            if (this._popup2.isOpen()) {
                return false;
            }

            this._popup2.addTo(this._map);

            const self = this;
            const div = this._popup2._container;
            const $p = $(this._popup2._container);
            const $t = $(div).find('.leaflet-popup-content');

            // offset用にサイズを取得する
            this._popup2.size_origin.w = $p.width();
            this._popup2.size_origin.h = $p.height();

            // 初回起動時にイベントの追加
            if (!this._popup2.dragging) {

                // 並び替え
                $p.find(".leaflet-popup-tip-container").prependTo($p);

                // ドラッグを可能にする
                this._popup2.dragging = new L.Draggable(div, div);
                this._popup2.dragging.enable();
                this._popup2.dragging.on({
                    dragend: function (e) {
                        this._popup2.options.offset = this._getPopupOffsetOrigin();
                        this._updateLine();
                        if (typeof (this._popupOptions.dragend) == 'function') {
                            this._popupOptions.dragend.call(this);
                        }
                    },
                    drag: function (e) {
                        this._updateLine();
                    }
                }, this);

                if (this._popupOptions.width) {
                    self._popup2.size.w = this._popupOptions.width;
                }
                if (this._popupOptions.height) {
                    self._popup2.size.h = this._popupOptions.height;
                }
            }

            if (self._popup2.size.w) {
                $t.width(self._popup2.size.w);
            }
            if (self._popup2.size.h) {
                $t.height(self._popup2.size.h);
            }

            // 再表示時にリサイズが動作しない為、再設定する。
            if ($t.is('.ui-resizable')) {
                $t.resizable('destroy');
            }
            $t.resizable({
                autoHide: true,
                stop: function () {
                    self._popup2.size.w = this.offsetWidth;
                    self._popup2.size.h = this.offsetHeight;
                    if (typeof (self._popupOptions.resizeend) == 'function') {
                        self._popupOptions.resizeend.call(self);
                    }
                }
            });

            return this;
        },
        setPopupContent: function (content) {
            this._addPopup2();

            if (this._popup2) {
                this._popup2.setContent(content);
            }
            return this;
        },
        // クリックした線を赤色で点滅させる
        blinkLine: function () {
            const self = this;

            // すでに点滅中の場合は停止
            if (this._blinkTimer) {
                clearInterval(this._blinkTimer);
                this._blinkTimer = null;
            }

            let blinkCount = 0;
            let visible = true;

            const originalStyle = {
                color: this._lineOptions.color || '#3388ff',
                opacity:
                    this._lineOptions.opacity !== undefined
                        ? this._lineOptions.opacity
                        : 1,
                weight:
                    this._lineOptions.weight !== undefined
                        ? this._lineOptions.weight
                        : 3
            };

//            const blinkWeight = Math.max(
//                originalStyle.weight + 4,
//                7
//            );
			const blinkWeight = originalStyle.weight;

            // 線を前面へ移動
            if (this._polyline2.bringToFront) {
                this._polyline2.bringToFront();
            }

            // クリック直後に赤く表示
            this._polyline2.setStyle({
                color: '#ff0000',
                opacity: 1,
                weight: blinkWeight
            });

            this._blinkTimer = setInterval(function () {

                if (visible) {
                    self._polyline2.setStyle({
                        color: '#ff0000',
                        opacity: 0.08,
                        weight: blinkWeight
                    });
                } else {
                    self._polyline2.setStyle({
                        color: '#ff0000',
                        opacity: 1,
                        weight: blinkWeight
                    });
                }

                visible = !visible;
                blinkCount++;

                // 10回で終了
                if (blinkCount >= 5) {
                    clearInterval(self._blinkTimer);
                    self._blinkTimer = null;

                    // 元の線スタイルへ戻す
                    self._polyline2.setStyle(
                        originalStyle
                    );
                }

            }, 250);

            return this;
        },

        onRemove: function (map2) {

            if (this._blinkTimer) {
                clearInterval(this._blinkTimer);
                this._blinkTimer = null;
            }

            this.closePopup2(map2);
            this._line.onRemove(map2);
            this._polyline2.onRemove(map2);
            L.CircleMarker.prototype.onRemove.call(this, map2);
            return this;
        },
        // ポップアップにイベントの追加
        popupOn: function (event, callback) {
            $(this._popup2._container).on(event, { leaflet: this }, callback);
        }
    });
    L.pline = function (latlng, latlng2, options, popupOptions, lineOptions) {
        return new L.PLine(latlng, latlng2, options, popupOptions, lineOptions);
    };
}())

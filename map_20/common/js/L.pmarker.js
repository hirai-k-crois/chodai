(function(){
    L.PMarker = L.Marker.extend({
        initialize: function (latlng, options, popupOptions) {
            // iconの設定
            var options = options || {};
            options.popup = options.popup || '...popup...';
            options.icon = options.icon || new L.Icon.Default();
            var popupOptions = popupOptions || {};

            this._polyline  = null;
            this._polygon   = null;
            this._line      = null;
            this._latlngs   = latlng;
            this._popupOptions = popupOptions;

            var markerPos = popupOptions.marker;

            // 四角と線の表示
            this._setItems(latlng);

            var ll = this._getMarkerLatLng(latlng, markerPos);
            L.Marker.prototype.initialize.call(this, ll, options);

        },
        // マーカーの位置
        _getMarkerLatLng: function(latlng, markerPos){
            return markerPos || ((latlng instanceof Array)?latlng[0]:latlng);
        },
        // 線を追加する
        _setItems: function(latlng, map2){
            if(latlng instanceof Array){
                // 生成
                if(latlng.length == 2){
                    if(!(this._polyline instanceof L.Polyline)){
                        this._polyline = L.polyline(latlng);
                    }
                }
                if(latlng.length > 2){
                    if(!(this._polygon instanceof L.Polygon)){
                        this._polygon = L.polygon(latlng);
                    }
                }
            }

            // 線の表示
            if(!(this._line instanceof L.Polyline)){
                this._line = L.polyline([], {
                    color: 'red',
                    opacity: 0.6,
                    weight: 4
                });
            }

            // 表示
            if(map2){
                if(this._polyline instanceof L.Polyline){
                    this._polyline.onAdd(map2);
                }

                if(this._polygon instanceof L.Polygon){
                    this._polygon.onAdd(map2);
                }

                if(this._line instanceof L.Polyline){
                    this._line.addTo(map2);
                }
            }


        },
        _movePopup: function(){
            // L.Markerの処理を無効化
        },
        onAdd: function(map2){
            L.Marker.prototype.onAdd.call(this, map2);

            // 四角と線の表示
            this._setItems(this._latlngs,this._map);

            // ポップアップを消さない
            this.on({
                move: function(e){
                    this._popup2.setLatLng(e.latlng);
                    this._updateLine();
                }, click: function(e){

                    if(this._popup2){
                        if (!this._popup2.isOpen()) {
                            this.openPopup2();
                        } else {
                            this.closePopup2();
                        }
                    }
                }
            });

            // ドラッグイベント ( 線の更新 ) 
            map2.on("zoomend", function(e){
                this._updateLine(); 
            }, this);
            map2.on("zoomstart", function(e){
                this._hiddenLine(); 
            }, this);
            map2.on("popupclose", function(e){
                if(e.popup._leaflet_id==this._popup2._leaflet_id){
                    this._hiddenLine();
                }
            }, this);
            map2.on("popupopen", function(e){
                if(e.popup._leaflet_id==this._popup2._leaflet_id){
                    this._updateLine();
                }
            }, this);

            // ポップアップの追加
            this._addPopup2();

            // 線の追加
            this._updateLine();

            return this;
        },
        _addPopup2: function(){
            if(!(this._popup2 instanceof L.Popup)){
                // ポップアップの追加
                var options = L.extend({
                    closeOnClick:false,
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
        _hiddenLine: function(){
            if(this._line instanceof L.Polyline){
                this._line.setLatLngs([]);
            }
        },
        // ポップアップのオフセットの取得
        _getPopupOffset: function(){
            var pos  = this.getLatLng();
            var p1 = this._map.latLngToLayerPoint(pos);

            var $p = $(this._popup2._container);
            var p2 = $p.position();
            var p2 = L.point(p2.left, p2.top);

            var w = $p.width();
            var h = $p.height();

            var p2 = p2.add([w/2,h]);

            return p2.subtract(p1);
        },
        // ポップアップのオフセットの取得
        _getPopupOffsetOrigin: function(){
            var pos  = this.getLatLng();
            var p1 = this._map.latLngToLayerPoint(pos);

            var $p = $(this._popup2._container);
            var p2 = $p.position();
            var p2 = L.point(p2.left, p2.top);

            var w = this._popup2.size_origin.w || 0;
            var h = $p.height();

            var p2 = p2.add([w/2,h]);

            return p2.subtract(p1);
        },
        // 線を引く
        _updateLine: function(){
            if(this._popup2.isOpen()){
                // マーカーの位置
                var pos1  = this.getLatLng();
                var offset  = this._getPopupOffset();
                offset.y -= $(this._popup2._container).height()/2;
                var pos2 = this._map.unproject(this._map.project(pos1).add(offset));
                this._line.setLatLngs([pos1,pos2]);
            } else {
                this._hiddenLine();
            }
        },
        togglePopup2: function(){
            if(this._popup2.isOpen()){
                this.closePopup2();
            } else {
                this.openPopup2();
            }
        },
        closePopup2: function(){
            if(this._popup2.isOpen()){
                var os = this._popup2.options.offset;

                // 削除
                this._popup = this._popup2;
                L.Marker.prototype.closePopup.call(this);
                this._popup = null;

                // offsetを復元する
                this._popup2.options.offset = os;
            }
            return this;
        },
        openPopup2: function(){

            if(!this._map){
                return false;
            }
            if(this._popup2.isOpen()){
                return false;
            }

            this._popup2.addTo(this._map);

            var self = this;
            var div = this._popup2._container;
            var $p = $(this._popup2._container);
            var $t = $(div).find('.leaflet-popup-content');

            // offset用にサイズを取得する
            this._popup2.size_origin.w = $p.width();
            this._popup2.size_origin.h = $p.height();

            // 初回起動時にイベントの追加
            if(!this._popup2.dragging){

                // 並び替え
                $p.find(".leaflet-popup-tip-container").prependTo($p);

                // ドラッグを可能にする
                this._popup2.dragging = new L.Draggable(div, div);
                this._popup2.dragging.enable();
                this._popup2.dragging.on({
                    dragend: function(e){
                        this._popup2.options.offset = this._getPopupOffsetOrigin();
                        this._updateLine();
                        if(typeof(this._popupOptions.dragend) == 'function'){
                            this._popupOptions.dragend.call(this);
                        }
                    },
                    drag: function(e){
                        this._updateLine();
                    }
                }, this);

                if(this._popupOptions.width){
                    self._popup2.size.w = this._popupOptions.width;
                }
                if(this._popupOptions.height){
                    self._popup2.size.h = this._popupOptions.height;
                }
            }

            if(self._popup2.size.w){
                $t.width(self._popup2.size.w);
            }
            if(self._popup2.size.h){
                $t.height(self._popup2.size.h);
            }

            // 再表示時にリサイズが動作しない為、再設定する。
            if($t.is('.ui-resizable')){
                $t.resizable('destroy');
            }
            $t.resizable({
                autoHide: true,
                stop: function(){
                    self._popup2.size.w = this.offsetWidth;
                    self._popup2.size.h = this.offsetHeight;
                    if(typeof(self._popupOptions.resizeend) == 'function'){
                        self._popupOptions.resizeend.call(self);
                    }
                }
            });

            return this;
        },
        setPopupContent: function(content){
            this._addPopup2();

            if (this._popup2) {
                this._popup2.setContent(content);
            }
            return this;
        },
        onRemove: function(map2){
            this.closePopup2(map2);
            if(this._line instanceof L.Polyline){
                this._line.onRemove(map2);
            }
            if(this._polyline instanceof L.Polyline){
                this._polyline.onRemove(map2);
            }
            if(this._polygon instanceof L.Polyline){
                this._polygon.onRemove(map2);
            }
            L.Marker.prototype.onRemove.call(this, map2);
            return this;
        },
        // ポップアップにイベントの追加
        popupOn: function(event, callback){
            $(this._popup2._container).on(event, {leaflet: this}, callback);
        }
    });
    L.pmarker = function (latlng, options, popupOptions) {
        return new L.PMarker(latlng, options, popupOptions);
    };
}())

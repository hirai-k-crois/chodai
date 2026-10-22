$(function(){

    var _isInit = true;
    var _markers = {};
    var _icons = createIcon();
    var _grid = {};
    var _map = {};
    var _dataView = new Slick.Data.DataView();
    var _html_file_name = window.location.href.replace(/file:\/\/(.*:).*/,'$1/');
    var _ua = navigator.userAgent.toLowerCase();
    var _is_ie = (_ua.indexOf('msie')!=-1||_ua.indexOf('trident')!=-1);
    var _storage = _is_ie ? docCookies : localStorage;

    window.data_csv = window.data_csv || {
        file:{ name:'', sheet:'', defname:'' },
        columns:[],
        data:[],
    };

    lightbox.option({
        fadeDuration: 0,
        imageFadeDuration: 0,
        resizeDuration: 0,
        albumLabel: '',
    });

    _map = L.map('map', {
        center: [35.3622222, 138.7313889],
        zoom: 14,
        maxZoom: 18,
        fadeAnimation: false
    });

    // seamlessphoto
/*
    //let url = 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png';						//通常地図
    let url = 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg';		//航空地図
    //let url = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';		//淡色地図
    L.tileLayer(url, {
        attribution: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
    }).addTo(_map);
*/
    _map.on('popupopen popupclose', function(e){
        var id = e.popup.options.data_id;
        var data = _dataView.getItemById(id);
        var row = _dataView.getRowById(id);
        var skey = data.key;

        data.is_popupopen = (e.type=='popupopen')?1:0;
        _dataView.updateItem(id, data);
        _grid.updateRow(row);

        var end = Infinity;
        _storage.setItem(skey+'-is_popupopen', data.is_popupopen,end, _html_file_name);
    });

    L.control.scale({imperial:false}).addTo(_map);


    var basemaps = {
      "標準地図": L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル利用規約</a>',
        minZoom: 0,
        maxZoom: 18
      }),
      "航空写真": L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル利用規約</a>',
        minZoom: 0,
        maxZoom: 18
      }),
      "淡色地図": L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル利用規約</a>',
        minZoom: 0,
        maxZoom: 18
      }),
      "GoogleMap標準": L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
        attribution: '<a href="https://developers.google.com/maps/documentation"> Google Map </a>',
        minZoom: 0,
        maxZoom: 18
      }),
      "GoogleMap航空写真": L.tileLayer('http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}', {
        attribution: '<a href="https://developers.google.com/maps/documentation"> Google Map </a>',
        minZoom: 0,
        maxZoom: 18
      }),
      "GoogleMap航空写真2": L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '<a href="https://developers.google.com/maps/documentation"> Google Map </a>',
        minZoom: 0,
        maxZoom: 18
      }),
      "GoogleMap道路": L.tileLayer('https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}', {
        attribution: '<a href="https://developers.google.com/maps/documentation"> Google Map </a>',
        minZoom: 0,
        maxZoom: 18
      }),
      "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        minZoom: 0,
        maxZoom: 18
      }),
      "Esri World Topo Map": L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: '<a href="http://www.esrij.com/"> Esri Japan </a>',
        minZoom: 0,
        maxZoom: 18
      }),


    };

    basemaps["標準地図"].addTo(_map); // 初期表示の背景地図を設定

    L.control.layers(basemaps).addTo(_map);

    window.map = _map;

    // テーブル
    function init() {

        // 検索用
        var cnt = 0;
        _dataView.setFilter(function (row, args) {
            if (!args || args.length == 0) {
                return true;
            }

            // And検索
            var isFind = true;
            var str = $.map(row,function(v,i){return v;}).join(' ');
            $.each(args, function(i2,v2){
                if(str.indexOf(v2)==-1){
                    isFind = false;
                    return false;
                }
            });
            return isFind;
        });

        var data = window.data_csv.data.slice(0);
        $.each(data, function (i, v) {
            data[i].id = i;
            data[i].x = data[i].x || 0;
            data[i].y = data[i].y || 0;
            data[i].w = data[i].w || 0;
            data[i].h = data[i].h || 0;
            data[i].is_visible = (data[i].is_visible||1)!=0?1:0;
            data[i].is_popupopen = (data[i].is_popupopen||0)!=0?1:0;
        });

        _dataView.setItems(data);

        var types = {};
        $.each(data[0], function(i,v){
            var type = 'num';
            $.each(data,function(i2,item){
                if(!isFinite(item[i])){
                    type = 'str';
                    return false;
                }
            });
            types[i] = type;
        });

        var columns = [
            { 
                id: 'is_visible',
                name: '<input type="checkbox">表示',
                field: "sel 1",
                formatter: formatter_checkbox
            }, {
                id: 'is_popupopen',
                name: '<input type="checkbox">旗',
                field: "sel 2",
                formatter: formatter_checkbox
            },
        ];
        for(var i=5;i<window.data_csv.columns.length;i++){
            var col = window.data_csv.columns[i];
            col.id = i+1;
            col.sortable = true;
            col.type = types[col.id];

            if(col.tag=='a'){
                col.formatter = formatter_atag;
            }

            if(col.tag!='img'){
                columns.push(col);
            }
        }

        var options = {
            enablecellnavigation: true,
            enablecolumnreorder: false,
            multiColumnSort: true
        };

        _grid = new Slick.Grid('#list', _dataView, columns, options);
        var pager = new Slick.Controls.Pager(_dataView, _grid, $("#pager"));

        // ソート
        _grid.onSort.subscribe(function(e,args){
            _dataView.sort(function(a,b){
                var v1,v2,asc;
                $.each(args.sortCols,function(i,v){
                    var col = v.sortCol;
                    asc = v.sortAsc ? 1 : -1;
                    v1 = a[col.field];
                    v2 = b[col.field];
                    if(col.type=='num'){
                        v1 = Number(v1);
                        v2 = Number(v2);
                    }
                    if(v1!=v2){
                        return false;
                    }
                });
                return (v1>v2) ? asc : -asc;
            });
        });

        // 選択
        _grid.onClick.subscribe(function (e, args) {

            // マーカー移動
            var data = args.grid.getDataItem(args.row);
            var lat = data[1];
            var lng = data[2];
            _map.setView([lat,lng]);

            // データ更新
            var id = _grid.getColumns()[args.cell].id;
            if(id!='is_visible' && id!='is_popupopen'){
                return;
            }
            if (!_grid.getEditorLock().commitCurrentEdit()) {
                return;
            }
            data[id] = data[id] ? 0 : 1;
            _dataView.updateItem(data.id, data);
            _grid.updateRow(args.row);

            // マーカー表示
            createMarker();
        });

        _grid.onHeaderClick.subscribe(function(e,args){
            var id = args.column.id;
            if(id!='is_visible'&&id!='is_popupopen'){
                return false;
            }
            if(!$(e.target).is('input')){
                return false;
            }
            var is_checked = $(e.target).is(":checked") ? 1 : 0;

            var len = _dataView.getLength();

            _dataView.beginUpdate();
            for(i=0;i<len;i++){
                var data = _dataView.getItem(i);
                data[id] = is_checked;
                _dataView.updateItem(data.id, data);
            }
            _dataView.endUpdate()
            _grid.invalidateAllRows();
            _grid.render();

            createMarker();
            redrawPopup();
        });

        function redrawPopup(){
            var data,i,m;
            for(i=0;i<_dataView.getLength();i++){
                data = _dataView.getItem(i) || {};
                m = _markers[data.id];
                if(m){
                    if(data.is_popupopen){
                        m.openPopup2();
                    } else {
                        m.closePopup2();
                    }
                }
            }
        }

        // 検索
        _dataView.onRowCountChanged.subscribe(function (e, args) {
            _grid.updateRowCount();
            _grid.render();
        });
        _dataView.onRowsChanged.subscribe(function (e, args) {
            _grid.invalidateRows(args.rows);
            _grid.render();
        });

        createMarker();
    };

    init();

    $('#search-word').on('keyup', function (e){
        if(!_dataView){
            return
        }
        if (e.which == 27) {
            this.value = '';
        }
        _dataView.setFilterArgs(this.value.split(' '));
        _dataView.refresh();
    });

    $('#clear').on('click', function () {
        $('#search-word').val('').trigger('keyup');
    });

    // ドラッグ処理
    $('#cst-grid-main')
        .resizable({
            autoHide: true,
            resize: function(){
                _grid.resizeCanvas();
            }
        })
        .draggable({})
        ;


    function createMarker(){
        var hiddens = [];
        var new_datas = [];
        var now_datas = [];
        var poses = [];

        for(var i=0;i<_dataView.getLength();i++){
            var data = _dataView.getItem(i);
            if(data.is_visible){
                now_datas.push(data);
            } else {
                hiddens.push(data.id);
            }
        }

        // 解除
        $.each(_markers, function(i,m){
            if($.inArray(Number(i),hiddens)!=-1){
                m.remove();
                delete _markers[i];
            }
        });

        // 追加
        $.each(now_datas, function(i,data){
            var id = data.id;
            if(!_markers[id]){
                new_datas.push(data);
            } else {
                if(data.is_popupopen){
                    _markers[id].openPopup2();
                }
            }
        });

        $.each(new_datas, function(i,data){
            var row = [];
            $.each(data, function(i,v){
                row[i] = v;
            });
            var id = data.id;
            var skey = data.key;
            var lat = row[1];
            var lng = row[2];
            var msg = row[3];
            var tooltip = row[4];
            var mk_type = row[5];
            popup = getPopup(window.data_csv.columns.slice(5), row.slice(6));

            var icon = $.extend(true,{},_icons[mk_type]);
            icon.options.html = icon.options.img + '<span>'+msg+'</span>';
            var x = Number(_storage.getItem(skey+'-x')) || row.x || 0;
            var y = Number(_storage.getItem(skey+'-y')) || row.y || 0;
            var w = Number(_storage.getItem(skey+'-w')) || row.w || 0;
            var h = Number(_storage.getItem(skey+'-h')) || row.h || 0;
            var offset = [x,y];
            var pos = L.latLng(lat,lng);

            data.is_popupopen = Number(_storage.getItem(skey+'-is_popupopen')) || data.is_popupopen || 0;

            if(pos){
                var m = L.pmarker(pos, {
                    icon: icon,
                    title: tooltip,
                    popup: popup,
                    // draggable: true,
                },{
                    data_id: id,
                    maxWidth: 500,
                    width: w,
                    height: h,
                    offset: offset,
                    dragend: function(){
                        var end = Infinity;
                        _storage.setItem(skey+'-x', this._popup2.options.offset.x,end, _html_file_name);
                        _storage.setItem(skey+'-y', this._popup2.options.offset.y,end, _html_file_name);
                    },
                    resizeend: function(){
                        var end = Infinity;
                        _storage.setItem(skey+'-w', this._popup2.size.w,end, _html_file_name);
                        _storage.setItem(skey+'-h', this._popup2.size.h,end, _html_file_name);
                    }
                }).addTo(_map);
                m.on('click moveend', function(){
                    var pos = this.getLatLng();
                    SetGoogleHref(pos);
                });
                _markers[data.id] = m;
            }
            poses.push(pos);
        });

        // マーカー
        for(var i=0;i<_dataView.getLength();i++){
            var data = _dataView.getItem(i);
            var m = _markers[data.id];
            if(m){
                if(data.is_popupopen){
                    m.openPopup2();
                } else {
                    m.closePopup2();
                }
            }
        }


        if(!_isInit || !location.href.match('#')){
            if(poses.length > 0){
                _map.fitBounds(poses);
            }
        }
    }

    function getPopup(cols, rows) {
        var rtn = '';
        var tables = [];
        var i = 0;

        // テーブル出力用にダミーデータを用意する
        cols.push({});

        var have_img = false;
        rtn = '';
        rtn += '<img class="cst-bg-white" src="./common/images/bg-white.png" />';
        rtn += '<table><tr><td class="cst-tbl-left">';
        $.each(cols, function(i){
            var tag = cols[i].tag;
            var title = cols[i].name;
            var val = rows[i];

            if (tag == 'table') {
                tables.push('<tr><td>' + title + '</td><td>' + val + '</td></tr>');
            } else {
                if (tables.length > 0) {
                    rtn += '<table>' + tables.join('') + '</table>';
                    tables = [];
                }
            }

            if (tag == 'img') {
                have_img = true;
            }

            if (tag == 'a') {
	            rtn += ' <div><a target="_blank" href="'+val+'">'+title+'</a></div>';
            }
            if (tag == 'h1' || tag == 'h2' || tag == 'h3') {
                if (val) {
                    rtn += '<' + tag + '>' + val + '</' + tag + '>';
                }
            }
        });
        if(have_img && cols.length>0){
            var html_img = '';
            $.each(cols, function(i){
                var tag = cols[i].tag;
                var title = cols[i].name;
                var val = rows[i];

                if (tag == 'img') {
                    // 画像フォルダ取得
                    dir = val.replace(/^\\/,'').replace(/\\/g,'/');
                    if (dir != '') {
	                    var url = '../../../kisei/r08/'+dir;
	                    //var url = dir;
	                    html_img += '<a href="' + url + '" target="_blank" rel="lightbox[1]">';
	                    html_img += '<img class="cst-image" src="' + url + '" alt="' + title + '" />'
	                    html_img += '</a>';
	                }
                }
            });

            if(html_img.length>0){
                rtn += '</td><td class="cst-tbl-right">';
                rtn += html_img;
            }
        }
        rtn += '</td></tr></table>';
        return rtn;
    }

    // アイコンの作成
    function createIcon(){

        var icons = [];

        $.each(window.icons, function(i,v){
            icons[i] = L.divIcon({
                className: v[3],
                iconSize: v[0],
                iconAnchor: v[1],
                img: '<img src="' + v[2] + '" />',
            });
        });
        return icons; 
    }

    function formatter_atag(a,b,c,d){
        return '<a href="'+c+'">Excel</a>';
    }
    function formatter_html(a,b,c,d){
        return c;
    }

    $('.cst-grid-close').on('click', function(){
        $('#cst-grid-main').hide();
    });
    $('#cst-grid-btn').on('click', function(){
        $('#cst-grid-main').toggle();
    });

    // data.js用文字列変換
    function GetDataJs(){
        var str_column;
        str_column = JSON.stringify(window.data_csv.columns);
        str_column = str_column.replace(/\[/g, "");
        str_column = str_column.replace(/"/g, "'");
        str_column = str_column.replace(/{/g, "\n  {");
        str_column = str_column.replace(/]/g, ",");
        str_column = str_column.replace(/,'id':\d*,'sortable':true,'type':'\w*'/g, "");

        var _datas = [];
        var j,keys,item;
        $.each(window.data_csv.data,function(i,item){
            item.x = item.x || 0;
            item.y = item.y || 0;
            item.is_visible = item.is_visible ? 1 : 0;
            item.is_popupopen = item.is_popupopen ? 1 : 0;
            keys = [
                'id',
                'key',
                'is_visible',
                'is_popupopen',
                'x',
                'y',
                'w',
                'h',
            ];
            $.each(window.data_csv.columns,function(i,k){
                keys.push(k.field);
            });
            _datas.push('  {');
            $.each(keys,function(i,k){
                var v = item[k];
                v = (v!==''&&isFinite(v)) ? Number(v) : "'"+v+"'";
                _datas.push("    '"+k+"': "+v+",");
            });
            _datas.push('  },');
        });
        var str_data = _datas.join("\n");

        var _lines = [];
        _lines.push("window.data_csv = {");
        _lines.push("'file':{");
        _lines.push(" 'name':'"+window.data_csv.file.name+"',");
        _lines.push(" 'sheet':'"+window.data_csv.file.sheet+"',");
        _lines.push(" 'defname':'"+window.data_csv.file.defname+"',");
        _lines.push("},");
        _lines.push("'columns':[");
        _lines.push(str_column);
        _lines.push("],");
        _lines.push("'data':[");
        _lines.push(str_data);
        _lines.push("]");
        _lines.push("};");
        return _lines.join("\n");
    }

    $('#btn_output').on('click', function(){
        $('#output').val(GetDataJs());
    });
    
    $('#cst-save').click(function(){

        if(!confirm('保存しますか？')){
            return;
        }

        // latlngの更新
        $.each(_markers, function(i){
            var m = this;
            var pos = m.getLatLng();
            data_csv.data[i][1] = pos.lat;
            data_csv.data[i][2] = pos.lng;

            var skey = data_csv.data[i]['key'];
            var x = Number(_storage.getItem(skey+'-x')) || 0;
            var y = Number(_storage.getItem(skey+'-y')) || 0;
            data_csv.data[i]['x'] = x;
            data_csv.data[i]['y'] = y;
        });

        // JSON形式の作成
        $('#output').val(GetDataJs());

        // データ送信
        $('#save').submit();

        init();
    });

    $('#cst-download').on('click', function(){
        var content = GetDataJs();

        $('#output').val(content);
        var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        var blob = new Blob([ bom, content ], { "type" : "text/plain" });

        if (window.navigator.msSaveBlob) { 
            window.navigator.msSaveBlob(blob, "data.js"); 

            // msSaveOrOpenBlobの場合はファイルを保存せずに開ける
            window.navigator.msSaveOrOpenBlob(blob, "data.js"); 
        } else {
            $(this).attr('href', window.URL.createObjectURL(blob));
        }
    });

    // 戻るボタン
    var isBack = false;
    $(window).on('popstate', function(a,b,c,d){
        if(!isBack){
            isBack = true;
            return;
        }
        SetViewFromUrl();
    });

    function SetViewFromUrl(url){
        var url = location.href;
        var pos = url.replace(/.*#/, '').split(',');
        if(isFinite(pos[0])&&isFinite(pos[1])&&isFinite(pos[2])){
            _map.setView(pos, pos[2]);
        }
    }

    _map.on('moveend', function(){
        isBack = false;
        var pos = _map.getCenter();
        var z = _map.getZoom();
        var str = pos.lat + ',' + pos.lng + ',' + z;
        location.href= location.href.replace(/#.*/,'') + '#' + str;
    });

    if(!!location.href.match('#')){
        SetViewFromUrl();
    }

    function formatter_checkbox(row, cell, value, columnDef, dataContext) {
        var id = columnDef.id;
        var dataContext = dataContext || {};
        if(dataContext[id]){
            return "<input type='checkbox' checked>";
        }
        return "<input type='checkbox'>";
    }

    // POST先修正
    if(location.href.indexOf('file:') == 0){
        $('#save').attr('action', 'http://127.0.0.1:1234/DataMap/index.php');
    }

    _isInit = false;
});


function triggerInputPath (e,id){
    var $n = $(e.target).next();
    if($n.is(':visible')){
        $n.hide();
    } else {
        $n.show().select();
    }
    return false;
}
function OpenGoogleMap(){
    var pos = $('#pos').text();
    var href = 'https://www.google.co.jp/maps?q=' + pos;
    $('#cst-google').attr('href', href);
}
function SetGoogleHref(pos){
    var str = pos.lat+','+pos.lng;
    var href = 'https://www.google.co.jp/maps?q=' + str;
    $('#pos')
        .attr('href',href)
        .text(str);
}


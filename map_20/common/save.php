<?php
$_POST = $_POST + array(
    'file' => 'data',
    'data' => '',
);
if(strlen($_POST['data']) > 0){

    // BACKUP
    date_default_timezone_set('Asia/Tokyo');
    $t = date('ymdHis');
    COPY('data.js', 'data ('.$t.').js');

    $file = __DIR__ . '\\' . $_POST['file'] . '.js';
    file_put_contents($file, $_POST['data']);
}
echo "<script>window.close();</script>";

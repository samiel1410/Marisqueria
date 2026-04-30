<?php
$data = array(
    'product_id' => 1,
    'monday' => 1,
    'tuesday' => 0,
    'wednesday' => 0,
    'thursday' => 0,
    'friday' => 0,
    'saturday' => 0,
    'sunday' => 0
);

$options = array(
    'http' => array(
        'header'  => "Content-type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    )
);

$context  = stream_context_create($options);
$result = file_get_contents('http://localhost/marisqueria/web/api/public/schedules', false, $context);
if ($result === FALSE) { 
    echo "Error";
} else {
    echo "Result: " . $result;
}

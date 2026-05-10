<?php
$c = mysqli_connect('localhost', 'root', '', 'marisqueria');
$res = mysqli_query($c, 'DESCRIBE order_items');
while($row = mysqli_fetch_assoc($res)) {
    print_r($row);
}

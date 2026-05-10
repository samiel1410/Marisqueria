<?php
$c = mysqli_connect('localhost', 'root', '', 'marisqueria');
$res = mysqli_query($c, 'SELECT * FROM product_branch_stock');
while($row = mysqli_fetch_assoc($res)) {
    print_r($row);
}

$path = 'C:\Users\WINDPINO\OneDrive\Desktop\no1dmkr26050421.dat'
$outPartners = 'src/data/partners_raw.txt'
$outProducts = 'src/data/products_raw.txt'
$outWarehouses = 'src/data/warehouses_raw.txt'

# Use CP949 encoding
$enc = [System.Text.Encoding]::GetEncoding(949)

Write-Host "Reading file..."
$lines = [System.IO.File]::ReadAllLines($path, $enc)

Write-Host "Filtering partners..."
$partners = $lines | Select-String "INSERT INTO \`customer\`"
[System.IO.File]::WriteAllLines($outPartners, $partners, [System.Text.Encoding]::UTF8)

Write-Host "Filtering products..."
$products = $lines | Select-String "INSERT INTO \`product_m\`"
[System.IO.File]::WriteAllLines($outProducts, $products, [System.Text.Encoding]::UTF8)

Write-Host "Filtering warehouses..."
$warehouses = $lines | Select-String "INSERT INTO \`storehouse\`"
[System.IO.File]::WriteAllLines($outWarehouses, $warehouses, [System.Text.Encoding]::UTF8)

Write-Host "Done!"

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$base = 'http://localhost:3001'
function Assert($condition, $message) { if (-not $condition) { throw "FAIL: $message" }; Write-Host "PASS: $message" }
Assert ((Invoke-WebRequest "$base/app" -UseBasicParsing).StatusCode -eq 200) 'App ciudadana responde'
Assert ((Invoke-WebRequest "$base/admin" -UseBasicParsing).StatusCode -eq 200) 'Sistema municipal responde'
$health = Invoke-RestMethod "$base/api/health"
Assert ($health.ok -eq $true) 'API disponible'
$reports = Invoke-RestMethod "$base/api/reports"
Assert ($reports.Count -ge 1) 'Reportes de demostración cargan'
$first = $reports[0]
$dupBody = [System.Text.Encoding]::UTF8.GetBytes((@{lat=$first.lat;lng=$first.lng;category=$first.category}|ConvertTo-Json -Compress))
$dup = Invoke-RestMethod -Method Post -Uri "$base/api/reports/duplicate" -ContentType 'application/json; charset=utf-8' -Body $dupBody
Assert ($null -ne $dup.duplicate) 'Detección Haversine encuentra reporte cercano'
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body '{"email":"admin@reporta.local","password":"Admin2026!"}'
Assert ($login.user.role -eq 'ADMIN_MUNICIPAL') 'Login administrador y RBAC'
$headers = @{ Authorization = "Bearer $($login.token)" }
$metrics = Invoke-RestMethod "$base/api/admin/metrics" -Headers $headers
Assert ($metrics.total -ge 1) 'Indicadores administrativos'
$queue = Invoke-RestMethod "$base/api/admin/verification-requests" -Headers $headers
Assert ($null -ne $queue) 'Cola de verificación disponible'
try { Invoke-RestMethod "$base/api/admin/verification-requests" | Out-Null; throw 'FAIL: se esperaba protección de autenticación' } catch { if ($_.Exception.Message -like 'FAIL:*') { throw }; Write-Host 'PASS: verificación protegida por login' }
try { Invoke-RestMethod -Method Post -Uri "$base/api/reports" -ContentType 'application/json' -Body '{"lat":0,"lng":0}' | Out-Null; throw 'FAIL: creación anónima aceptada' } catch { if ($_.Exception.Message -like 'FAIL:*') { throw }; Write-Host 'PASS: creación de reportes exige sesión ciudadana' }
$badMedia = @{lat=-41.33;lng=-73.2;category='Otro';description='Incidencia de prueba de multimedia';rut='12.345.678-5';email='prueba@example.com';media=@(@{type='video/mp4';data='data:video/mp4;base64,AAAA'})} | ConvertTo-Json -Depth 5 -Compress
try { Invoke-RestMethod -Method Post -Uri "$base/api/reports" -ContentType 'application/json' -Body $badMedia | Out-Null; throw 'FAIL: firma de video falsa aceptada' } catch { if ($_.Exception.Message -like 'FAIL:*') { throw }; Write-Host 'PASS: firma binaria de video falsa rechazada' }
node --check server.js
if ($LASTEXITCODE -ne 0) { throw 'server.js syntax check failed' }
node --check public/app.js
if ($LASTEXITCODE -ne 0) { throw 'app.js syntax check failed' }
Write-Host 'PASS: sintaxis JavaScript'

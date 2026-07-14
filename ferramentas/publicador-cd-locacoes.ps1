$ErrorActionPreference = "Stop"

$Desenvolvimento = "C:\Users\CaFe\Pictures\Nova pasta\CD-LOCACOES-1-5"
$Producao = "C:\Users\CaFe\OneDrive\Documentos\PROJETO APP\CD-LOCACOES-PRODUCAO"
$ControlePublicador = ".publicador-cd-locacoes.json"
$BackupPublicador = "BACKUP_PUBLICADOR"

function Pausar {
  Write-Host ""
  Write-Host "Pressione qualquer tecla para fechar..."
  [void][System.Console]::ReadKey($true)
}

function Mostrar-Cabecalho {
  Clear-Host
  Write-Host "=================================================="
  Write-Host "          PUBLICADOR CD LOCACOES"
  Write-Host "=================================================="
  Write-Host ""
  Write-Host "Desenvolvimento:"
  Write-Host $Desenvolvimento
  Write-Host ""
  Write-Host "Producao:"
  Write-Host $Producao
  Write-Host ""
}

function Perguntar-SimNao {
  param(
    [Parameter(Mandatory = $true)][string]$Mensagem,
    [string]$Padrao = "N"
  )

  while ($true) {
    $resposta = Read-Host "$Mensagem (S/N)"
    if ([string]::IsNullOrWhiteSpace($resposta)) { $resposta = $Padrao }
    $resposta = $resposta.Trim().ToUpperInvariant()
    if ($resposta -eq "S") { return $true }
    if ($resposta -eq "N") { return $false }
    Write-Host "Digite apenas S ou N."
  }
}

function Invocar-Comando {
  param(
    [Parameter(Mandatory = $true)][string]$Programa,
    [string[]]$Argumentos = @(),
    [string]$Diretorio = ""
  )

  $localAtual = Get-Location
  try {
    if ($Diretorio) { Set-Location -LiteralPath $Diretorio }
    $saida = & $Programa @Argumentos 2>&1
    $codigo = $LASTEXITCODE
    return [pscustomobject]@{
      Codigo = $codigo
      Saida = @($saida)
    }
  } finally {
    Set-Location -LiteralPath $localAtual
  }
}

function Invocar-Git {
  param(
    [Parameter(Mandatory = $true)][string]$Repositorio,
    [Parameter(Mandatory = $true)][string[]]$Argumentos,
    [switch]$PermitirFalha
  )

  $resultado = Invocar-Comando -Programa "git" -Argumentos (@("-C", $Repositorio) + $Argumentos)
  if ($resultado.Codigo -ne 0 -and -not $PermitirFalha) {
    throw "Falha ao executar git $($Argumentos -join ' ') em $Repositorio`n$($resultado.Saida -join "`n")"
  }
  return $resultado
}

function Testar-PreRequisitos {
  Write-Host "Verificando pastas e ferramentas..."

  foreach ($pasta in @($Desenvolvimento, $Producao)) {
    if (-not (Test-Path -LiteralPath $pasta -PathType Container)) {
      throw "Pasta nao encontrada: $pasta"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $pasta ".git") -PathType Container)) {
      throw "A pasta nao possui .git: $pasta"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $pasta "package.json") -PathType Leaf)) {
      throw "A pasta nao possui package.json: $pasta"
    }
  }

  foreach ($comando in @("git", "node", "npm")) {
    if (-not (Get-Command $comando -ErrorAction SilentlyContinue)) {
      throw "Ferramenta nao encontrada no PATH: $comando"
    }
  }

  Write-Host "Verificacoes iniciais OK."
  Write-Host ""
}

function Testar-DesenvolvimentoLimpo {
  $status = Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("status", "--porcelain")
  if ($status.Saida.Count -gt 0 -and ($status.Saida -join "").Trim()) {
    Write-Host "Existem alteracoes nao commitadas no Desenvolvimento." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Faca primeiro:"
    Write-Host 'git add .'
    Write-Host 'git commit -m "Descricao"'
    Write-Host 'git push origin main'
    Write-Host ""
    throw "Publicacao interrompida. A ferramenta nao publica arquivos ainda nao commitados."
  }
}

function Testar-CaminhoIgnorado {
  param([Parameter(Mandatory = $true)][string]$Caminho)

  $normalizado = $Caminho.Replace("\", "/").Trim("/")
  if (-not $normalizado) { return $true }

  if ($normalizado -eq "PUBLICAR-CD-LOCACOES.bat") { return $true }
  if ($normalizado -like "ferramentas/*") { return $true }
  if ($normalizado -like ".git/*" -or $normalizado -eq ".git") { return $true }
  if ($normalizado -like "node_modules/*" -or $normalizado -eq "node_modules") { return $true }
  if ($normalizado -like "dist/*" -or $normalizado -eq "dist") { return $true }
  if ($normalizado -eq ".env" -or $normalizado -like ".env.*") { return $true }
  if ($normalizado -eq ".npm-cache" -or $normalizado -like ".npm-cache/*") { return $true }

  return $false
}

function Obter-UltimoCommit {
  $hashCompleto = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("rev-parse", "HEAD")).Saida[0].ToString().Trim()
  $hashCurto = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("rev-parse", "--short", "HEAD")).Saida[0].ToString().Trim()
  $mensagem = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("log", "-1", "--pretty=%s")).Saida[0].ToString().Trim()
  $data = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("log", "-1", "--date=iso-local", "--pretty=%cd")).Saida[0].ToString().Trim()
  $linhas = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("diff-tree", "--no-commit-id", "--name-status", "-r", "-M", "HEAD")).Saida

  $arquivos = @()
  foreach ($linha in $linhas) {
    $texto = $linha.ToString()
    if (-not $texto.Trim()) { continue }
    $partes = $texto -split "`t"
    $status = $partes[0]

    if ($status -like "R*") {
      $antigo = $partes[1]
      $novo = $partes[2]
      if ((Testar-CaminhoIgnorado $antigo) -or (Testar-CaminhoIgnorado $novo)) { continue }
      $arquivos += [pscustomobject]@{ Status = "R"; Antigo = $antigo; Novo = $novo; Exibir = "[R] $antigo -> $novo" }
      continue
    }

    $caminho = $partes[1]
    if (Testar-CaminhoIgnorado $caminho) { continue }
    $tipo = $status.Substring(0, 1)
    if ($tipo -notin @("A", "M", "D")) { continue }
    $arquivos += [pscustomobject]@{ Status = $tipo; Antigo = $null; Novo = $caminho; Exibir = "[$tipo] $caminho" }
  }

  return [pscustomobject]@{
    HashCompleto = $hashCompleto
    HashCurto = $hashCurto
    Mensagem = $mensagem
    Data = $data
    Arquivos = $arquivos
  }
}

function Mostrar-Previa {
  param([Parameter(Mandatory = $true)]$Commit)

  Write-Host "Ultimo commit de Desenvolvimento:"
  Write-Host ""
  Write-Host "Hash: $($Commit.HashCurto)"
  Write-Host "Mensagem: $($Commit.Mensagem)"
  Write-Host "Data: $($Commit.Data)"
  Write-Host ""
  Write-Host "Arquivos que serao publicados:"
  Write-Host ""
  if ($Commit.Arquivos.Count -eq 0) {
    Write-Host "Nenhum arquivo valido para publicar."
  } else {
    foreach ($arquivo in $Commit.Arquivos) {
      Write-Host $arquivo.Exibir
    }
  }
  Write-Host ""
  Write-Host "Legenda: [A] Adicionado  [M] Modificado  [D] Removido  [R] Renomeado"
  Write-Host ""
}

function Obter-ControlePublicador {
  $caminho = Join-Path $Producao $ControlePublicador
  if (-not (Test-Path -LiteralPath $caminho -PathType Leaf)) { return $null }
  return Get-Content -LiteralPath $caminho -Raw | ConvertFrom-Json
}

function Adicionar-LinhaGitignoreProducao {
  param([Parameter(Mandatory = $true)][string]$Linha)

  $gitignore = Join-Path $Producao ".gitignore"
  if (-not (Test-Path -LiteralPath $gitignore -PathType Leaf)) {
    Set-Content -LiteralPath $gitignore -Value "$Linha`r`n" -Encoding UTF8
    return
  }

  $conteudo = Get-Content -LiteralPath $gitignore
  if ($conteudo -notcontains $Linha) {
    Add-Content -LiteralPath $gitignore -Value $Linha -Encoding UTF8
  }
}

function Preparar-GitignoreProducao {
  try {
    Adicionar-LinhaGitignoreProducao -Linha $ControlePublicador
    Adicionar-LinhaGitignoreProducao -Linha "$BackupPublicador/"
  } catch {
    Write-Host "Nao foi possivel atualizar automaticamente o .gitignore da Producao." -ForegroundColor Yellow
    Write-Host $_.Exception.Message
  }
}

function Copiar-ComBackup {
  param(
    [Parameter(Mandatory = $true)]$Arquivos,
    [Parameter(Mandatory = $true)][string]$PastaBackup
  )

  $novosCriados = @()
  $removidos = @()

  foreach ($arquivo in $Arquivos) {
    if ($arquivo.Status -eq "A" -or $arquivo.Status -eq "M" -or $arquivo.Status -eq "R") {
      $caminhoNovo = $arquivo.Novo
      $origem = Join-Path $Desenvolvimento $caminhoNovo
      $destino = Join-Path $Producao $caminhoNovo

      if (-not (Test-Path -LiteralPath $origem -PathType Leaf)) {
        throw "Arquivo de origem nao encontrado: $caminhoNovo"
      }

      if (Test-Path -LiteralPath $destino -PathType Leaf) {
        $backupDestino = Join-Path $PastaBackup $caminhoNovo
        New-Item -ItemType Directory -Path (Split-Path -Path $backupDestino -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $destino -Destination $backupDestino -Force
      } else {
        $novosCriados += $caminhoNovo
      }

      New-Item -ItemType Directory -Path (Split-Path -Path $destino -Parent) -Force | Out-Null
      Copy-Item -LiteralPath $origem -Destination $destino -Force
    }

    if ($arquivo.Status -eq "D" -or $arquivo.Status -eq "R") {
      $caminhoAntigo = if ($arquivo.Status -eq "R") { $arquivo.Antigo } else { $arquivo.Novo }
      $destinoAntigo = Join-Path $Producao $caminhoAntigo
      if (Test-Path -LiteralPath $destinoAntigo -PathType Leaf) {
        $backupAntigo = Join-Path $PastaBackup $caminhoAntigo
        New-Item -ItemType Directory -Path (Split-Path -Path $backupAntigo -Parent) -Force | Out-Null
        if (-not (Test-Path -LiteralPath $backupAntigo -PathType Leaf)) {
          Copy-Item -LiteralPath $destinoAntigo -Destination $backupAntigo -Force
        }
        Remove-Item -LiteralPath $destinoAntigo -Force
        $removidos += $caminhoAntigo
        Remover-PastasVazias -CaminhoInicial (Split-Path -Path $destinoAntigo -Parent)
      }
    }
  }

  return [pscustomobject]@{
    NovosCriados = $novosCriados
    Removidos = $removidos
  }
}

function Remover-PastasVazias {
  param([Parameter(Mandatory = $true)][string]$CaminhoInicial)

  $raiz = (Resolve-Path -LiteralPath $Producao).Path
  $atual = $CaminhoInicial

  while ($atual -and (Test-Path -LiteralPath $atual -PathType Container)) {
    $resolvido = (Resolve-Path -LiteralPath $atual).Path
    if ($resolvido -eq $raiz -or -not $resolvido.StartsWith($raiz)) { break }
    if ((Get-ChildItem -LiteralPath $resolvido -Force | Select-Object -First 1)) { break }
    Remove-Item -LiteralPath $resolvido -Force
    $atual = Split-Path -Path $resolvido -Parent
  }
}

function Validar-Copia {
  param([Parameter(Mandatory = $true)]$Arquivos)

  foreach ($arquivo in $Arquivos) {
    if ($arquivo.Status -eq "A" -or $arquivo.Status -eq "M" -or $arquivo.Status -eq "R") {
      $origem = Join-Path $Desenvolvimento $arquivo.Novo
      $destino = Join-Path $Producao $arquivo.Novo
      if (-not (Test-Path -LiteralPath $destino -PathType Leaf)) {
        throw "Validacao falhou. Arquivo nao existe no destino: $($arquivo.Novo)"
      }
      $hashOrigem = (Get-FileHash -LiteralPath $origem -Algorithm SHA256).Hash
      $hashDestino = (Get-FileHash -LiteralPath $destino -Algorithm SHA256).Hash
      if ($hashOrigem -ne $hashDestino) {
        throw "Validacao falhou. Hash diferente: $($arquivo.Novo)"
      }
    }

    if ($arquivo.Status -eq "D" -or $arquivo.Status -eq "R") {
      $antigo = if ($arquivo.Status -eq "R") { $arquivo.Antigo } else { $arquivo.Novo }
      $destinoAntigo = Join-Path $Producao $antigo
      if (Test-Path -LiteralPath $destinoAntigo -PathType Leaf) {
        throw "Validacao falhou. Arquivo removido ainda existe: $antigo"
      }
    }
  }
}

function Restaurar-Backup {
  param(
    [Parameter(Mandatory = $true)][string]$PastaBackup,
    [string[]]$NovosCriados = @()
  )

  foreach ($novo in $NovosCriados) {
    $destino = Join-Path $Producao $novo
    if (Test-Path -LiteralPath $destino -PathType Leaf) {
      Remove-Item -LiteralPath $destino -Force
      Remover-PastasVazias -CaminhoInicial (Split-Path -Path $destino -Parent)
    }
  }

  if (Test-Path -LiteralPath $PastaBackup -PathType Container) {
    Get-ChildItem -LiteralPath $PastaBackup -Recurse -File | ForEach-Object {
      $relativo = $_.FullName.Substring($PastaBackup.Length).TrimStart("\", "/")
      $destino = Join-Path $Producao $relativo
      New-Item -ItemType Directory -Path (Split-Path -Path $destino -Parent) -Force | Out-Null
      Copy-Item -LiteralPath $_.FullName -Destination $destino -Force
    }
  }
}

function Executar-BuildProducao {
  Write-Host ""
  Write-Host "Executando npm run build na Producao..."
  $resultado = Invocar-Comando -Programa "npm" -Argumentos @("run", "build") -Diretorio $Producao
  $resultado.Saida | ForEach-Object { Write-Host $_ }
  if ($resultado.Codigo -ne 0) {
    throw "BUILD FALHOU.`nNenhum commit ou push foi realizado."
  }
}

function Registrar-Publicacao {
  param(
    [Parameter(Mandatory = $true)]$CommitDev,
    [Parameter(Mandatory = $true)]$Arquivos,
    [string]$CommitProducao = ""
  )

  $controle = [pscustomobject]@{
    ultimoCommitDesenvolvimentoPublicado = $CommitDev.HashCompleto
    dataPublicacao = (Get-Date).ToString("o")
    mensagemCommitDesenvolvimento = $CommitDev.Mensagem
    arquivosPublicados = @($Arquivos | ForEach-Object { $_.Exibir })
    commitProducao = $CommitProducao
  }

  $controle | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Producao $ControlePublicador) -Encoding UTF8
}

function Publicar {
  param([switch]$Simulacao)

  Mostrar-Cabecalho
  Testar-PreRequisitos
  Testar-DesenvolvimentoLimpo
  $commit = Obter-UltimoCommit
  Mostrar-Previa -Commit $commit

  if ($commit.Arquivos.Count -eq 0) {
    Write-Host "Nada a publicar."
    return
  }

  if ($Simulacao) {
    Write-Host "SIMULACAO: nenhuma alteracao foi feita."
    Write-Host ""
    Write-Host "O script copiaria/removeria/renomearia os arquivos listados acima."
    return
  }

  Preparar-GitignoreProducao
  $controle = Obter-ControlePublicador
  if ($controle -and $controle.ultimoCommitDesenvolvimentoPublicado -eq $commit.HashCompleto) {
    Write-Host "Este commit de Desenvolvimento ja foi publicado anteriormente." -ForegroundColor Yellow
    if (-not (Perguntar-SimNao -Mensagem "Publicar novamente?" -Padrao "N")) { return }
  }

  if (-not (Perguntar-SimNao -Mensagem "Deseja copiar estes arquivos para Producao?" -Padrao "N")) {
    Write-Host "Operacao cancelada. Nada foi copiado."
    return
  }

  $pastaBackup = Join-Path (Join-Path $Producao $BackupPublicador) (Get-Date -Format "yyyy-MM-dd_HH-mm-ss")
  New-Item -ItemType Directory -Path $pastaBackup -Force | Out-Null
  $resultadoCopia = $null

  try {
    $resultadoCopia = Copiar-ComBackup -Arquivos $commit.Arquivos -PastaBackup $pastaBackup
    Validar-Copia -Arquivos $commit.Arquivos
  } catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Nao sera executado build nem Git na Producao."
    if (Perguntar-SimNao -Mensagem "Restaurar os arquivos anteriores pelo backup?" -Padrao "S") {
      $novosCriados = if ($resultadoCopia) { $resultadoCopia.NovosCriados } else { @() }
      Restaurar-Backup -PastaBackup $pastaBackup -NovosCriados $novosCriados
      Write-Host "Backup restaurado."
    }
    throw
  }

  Write-Host ""
  Write-Host "Arquivos copiados e validados com sucesso."
  Write-Host "Backup automatico:"
  Write-Host $pastaBackup

  if (Perguntar-SimNao -Mensagem "Executar npm run build na Producao?" -Padrao "S") {
    try {
      Executar-BuildProducao
      Write-Host "BUILD CONCLUIDO COM SUCESSO."
    } catch {
      Write-Host $_.Exception.Message -ForegroundColor Red
      if (Perguntar-SimNao -Mensagem "Restaurar os arquivos anteriores pelo backup?" -Padrao "S") {
        Restaurar-Backup -PastaBackup $pastaBackup -NovosCriados $resultadoCopia.NovosCriados
        Write-Host "Backup restaurado."
      }
      return
    }
  }

  Write-Host ""
  Write-Host "Status da Producao:"
  $statusProd = Invocar-Git -Repositorio $Producao -Argumentos @("status", "--short")
  $statusProd.Saida | ForEach-Object { Write-Host $_ }

  Write-Host ""
  Write-Host "Mensagem sugerida:"
  Write-Host $commit.Mensagem
  $mensagemCommit = Read-Host "Pressione ENTER para usar essa mensagem ou digite outra mensagem"
  if ([string]::IsNullOrWhiteSpace($mensagemCommit)) { $mensagemCommit = $commit.Mensagem }
  while ([string]::IsNullOrWhiteSpace($mensagemCommit)) {
    $mensagemCommit = Read-Host "Digite uma mensagem de commit valida"
  }

  Write-Host ""
  Write-Host "Serao executados na Producao:"
  Write-Host "git add ."
  Write-Host "git commit -m `"$mensagemCommit`""
  Write-Host "git push origin main"
  Write-Host ""

  if (-not (Perguntar-SimNao -Mensagem "Confirmar publicacao?" -Padrao "N")) {
    Write-Host "Commit/push cancelados. Os arquivos permanecem copiados na Producao."
    return
  }

  Invocar-Git -Repositorio $Producao -Argumentos @("add", ".") | Out-Null
  $commitProd = Invocar-Git -Repositorio $Producao -Argumentos @("commit", "-m", $mensagemCommit) -PermitirFalha
  $commitProd.Saida | ForEach-Object { Write-Host $_ }
  if ($commitProd.Codigo -ne 0) {
    Write-Host "git commit falhou. O push nao sera executado." -ForegroundColor Red
    return
  }

  $push = Invocar-Git -Repositorio $Producao -Argumentos @("push", "origin", "main") -PermitirFalha
  $push.Saida | ForEach-Object { Write-Host $_ }
  if ($push.Codigo -ne 0) {
    Write-Host "git push falhou." -ForegroundColor Red
    Write-Host "Voce pode repetir manualmente na Producao:"
    Write-Host "git push origin main"
    return
  }

  $hashProd = (Invocar-Git -Repositorio $Producao -Argumentos @("rev-parse", "--short", "HEAD")).Saida[0].ToString().Trim()
  Registrar-Publicacao -CommitDev $commit -Arquivos $commit.Arquivos -CommitProducao $hashProd

  Write-Host ""
  Write-Host "=================================================="
  Write-Host "       PUBLICACAO CONCLUIDA COM SUCESSO"
  Write-Host "=================================================="
  Write-Host ""
  Write-Host "Commit de Desenvolvimento: $($commit.HashCurto)"
  Write-Host "Commit de Producao: $hashProd"
  Write-Host "Arquivos publicados: $($commit.Arquivos.Count)"
  Write-Host "Build: OK"
  Write-Host "Push: OK"
  Write-Host ""
  Write-Host "A Vercel de Producao iniciara o deploy automaticamente."
}

try {
  Mostrar-Cabecalho
  Write-Host "1 - Simular publicacao"
  Write-Host "2 - Publicar em Producao"
  Write-Host "3 - Sair"
  Write-Host ""

  do {
    $opcao = Read-Host "Escolha uma opcao"
  } while ($opcao -notin @("1", "2", "3"))

  if ($opcao -eq "1") {
    Publicar -Simulacao
  } elseif ($opcao -eq "2") {
    Publicar
  } else {
    Write-Host "Saindo sem alterar nada."
  }
} catch {
  Write-Host ""
  Write-Host "ERRO:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
  Pausar
}

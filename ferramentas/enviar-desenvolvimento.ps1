$ErrorActionPreference = "Stop"

$Projeto = "C:\Users\CaFe\Pictures\Nova pasta\CD-LOCACOES-1-5"

function Pausar {
  Write-Host ""
  Write-Host "Pressione qualquer tecla para fechar..."
  [void][System.Console]::ReadKey($true)
}

function Mostrar-Cabecalho {
  Clear-Host
  Write-Host "=========================================="
  Write-Host "      ENVIAR DESENVOLVIMENTO"
  Write-Host "=========================================="
  Write-Host ""
  Write-Host "Projeto:"
  Write-Host ""
  Write-Host $Projeto
  Write-Host ""
}

function Perguntar-SimNao {
  param(
    [Parameter(Mandatory = $true)][string]$Mensagem,
    [string]$Padrao = "N"
  )

  while ($true) {
    Write-Host $Mensagem
    Write-Host ""
    $resposta = Read-Host "S/N"
    if ([string]::IsNullOrWhiteSpace($resposta)) { $resposta = $Padrao }
    $resposta = $resposta.Trim().ToUpperInvariant()
    if ($resposta -eq "S") { return $true }
    if ($resposta -eq "N") { return $false }
    Write-Host "Digite apenas S ou N."
    Write-Host ""
  }
}

function Invocar-Comando {
  param(
    [Parameter(Mandatory = $true)][string]$Programa,
    [string[]]$Argumentos = @(),
    [switch]$MostrarSaida
  )

  $localAtual = Get-Location
  try {
    Set-Location -LiteralPath $Projeto
    $saida = & $Programa @Argumentos 2>&1
    $codigo = $LASTEXITCODE
    if ($MostrarSaida) {
      $saida | ForEach-Object { Write-Host $_ }
    }
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
    [Parameter(Mandatory = $true)][string[]]$Argumentos,
    [switch]$MostrarSaida,
    [switch]$PermitirFalha
  )

  $resultado = Invocar-Comando -Programa "git" -Argumentos $Argumentos -MostrarSaida:$MostrarSaida
  if ($resultado.Codigo -ne 0 -and -not $PermitirFalha) {
    throw "Falha ao executar git $($Argumentos -join ' ')`n$($resultado.Saida -join "`n")"
  }
  return $resultado
}

function Testar-PreRequisitos {
  if (-not (Test-Path -LiteralPath $Projeto -PathType Container)) {
    throw "Pasta do projeto nao encontrada: $Projeto"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $Projeto "package.json") -PathType Leaf)) {
    throw "package.json nao encontrado."
  }
  if (-not (Test-Path -LiteralPath (Join-Path $Projeto ".git") -PathType Container)) {
    throw ".git nao encontrado."
  }
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git nao encontrado no PATH."
  }
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm nao encontrado no PATH."
  }
}

function Obter-Alteracoes {
  $status = Invocar-Git -Argumentos @("status", "--short")
  return @($status.Saida | ForEach-Object { $_.ToString() } | Where-Object { $_.Trim() })
}

function Mostrar-Alteracoes {
  param([Parameter(Mandatory = $true)][string[]]$Alteracoes)

  Write-Host "Arquivos alterados:"
  Write-Host ""

  foreach ($linha in $Alteracoes) {
    $codigo = $linha.Substring(0, 2)
    $arquivo = $linha.Substring(3)
    $tipo = if ($codigo -match "A|\?") {
      "A"
    } elseif ($codigo -match "D") {
      "D"
    } else {
      "M"
    }

    Write-Host "[$tipo] $arquivo"
    Write-Host ""
  }
}

function Executar-Build {
  Write-Host ""
  Write-Host "Executando npm run build..."
  Write-Host ""
  $localAtual = Get-Location
  try {
    Set-Location -LiteralPath $Projeto
    & npm.cmd run build
    $codigoBuild = $LASTEXITCODE
  } finally {
    Set-Location -LiteralPath $localAtual
  }

  if ($codigoBuild -ne 0) {
    Write-Host ""
    Write-Host "BUILD FALHOU" -ForegroundColor Red
    Write-Host ""
    Write-Host "Nenhum commit foi realizado."
    return $false
  }

  Write-Host ""
  Write-Host "BUILD CONCLUIDO COM SUCESSO" -ForegroundColor Green
  return $true
}

function Solicitar-MensagemCommit {
  do {
    $mensagem = Read-Host "Mensagem do commit"
    if ([string]::IsNullOrWhiteSpace($mensagem)) {
      Write-Host "A mensagem nao pode ficar vazia."
    }
  } while ([string]::IsNullOrWhiteSpace($mensagem))

  return $mensagem.Trim()
}

function Executar-GitDireto {
  param([Parameter(Mandatory = $true)][string[]]$Argumentos)

  $localAtual = Get-Location
  try {
    Set-Location -LiteralPath $Projeto
    & git @Argumentos
    $codigoGit = $LASTEXITCODE
  } finally {
    Set-Location -LiteralPath $localAtual
  }

  return $codigoGit
}

function Executar-Fluxo {
  param([switch]$Simulacao)

  Mostrar-Cabecalho
  Testar-PreRequisitos

  $alteracoes = Obter-Alteracoes
  if ($alteracoes.Count -eq 0) {
    Write-Host "Nenhuma alteracao encontrada."
    return
  }

  Mostrar-Alteracoes -Alteracoes $alteracoes

  if (-not (Perguntar-SimNao -Mensagem "Executar build?" -Padrao "N")) {
    Write-Host "Operacao cancelada antes do build."
    return
  }

  if (-not (Executar-Build)) {
    return
  }

  Write-Host ""
  Write-Host "git status"
  Write-Host ""
  Invocar-Git -Argumentos @("status") -MostrarSaida | Out-Null

  $mensagemCommit = Solicitar-MensagemCommit

  Write-Host ""
  Write-Host "Serao executados:"
  Write-Host ""
  Write-Host "git add ."
  Write-Host ""
  Write-Host "git commit -m `"$mensagemCommit`""
  Write-Host ""
  Write-Host "git push origin main"
  Write-Host ""

  if ($Simulacao) {
    Write-Host "SIMULACAO: git add, git commit e git push nao foram executados."
    return
  }

  if (-not (Perguntar-SimNao -Mensagem "Confirmar?" -Padrao "N")) {
    Write-Host "Operacao cancelada antes do Git."
    return
  }

  $codigoGitAdd = Executar-GitDireto -Argumentos @("add", ".")
  if ($codigoGitAdd -ne 0) {
    Write-Host ""
    Write-Host "git add falhou. O commit e o push nao serao executados." -ForegroundColor Red
    return
  }

  $codigoGitCommit = Executar-GitDireto -Argumentos @("commit", "-m", $mensagemCommit)
  if ($codigoGitCommit -ne 0) {
    Write-Host ""
    Write-Host "git commit falhou. O push nao sera executado." -ForegroundColor Red
    return
  }

  $codigoGitPush = Executar-GitDireto -Argumentos @("push", "origin", "main")
  if ($codigoGitPush -ne 0) {
    Write-Host ""
    Write-Host "git push falhou. O commit local foi criado, mas nao foi enviado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Voce pode tentar manualmente:"
    Write-Host "git push origin main"
    return
  }

  $hash = (Invocar-Git -Argumentos @("rev-parse", "--short", "HEAD")).Saida[0].ToString().Trim()

  Write-Host ""
  Write-Host "=========================================="
  Write-Host ""
  Write-Host "DESENVOLVIMENTO ATUALIZADO"
  Write-Host ""
  Write-Host "Commit: $hash"
  Write-Host ""
  Write-Host "Push: OK"
  Write-Host ""
  Write-Host "A Vercel de Desenvolvimento iniciara o deploy automaticamente."
  Write-Host ""
  Write-Host "=========================================="
}

try {
  Mostrar-Cabecalho
  Write-Host "1 - Simular envio"
  Write-Host ""
  Write-Host "2 - Enviar Desenvolvimento"
  Write-Host ""
  Write-Host "3 - Sair"
  Write-Host ""

  do {
    $opcao = Read-Host "Escolha uma opcao"
  } while ($opcao -notin @("1", "2", "3"))

  if ($opcao -eq "1") {
    Executar-Fluxo -Simulacao
  } elseif ($opcao -eq "2") {
    Executar-Fluxo
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

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
  if ($normalizado -like "BACKUP_PUBLICADOR/*" -or $normalizado -eq "BACKUP_PUBLICADOR") { return $true }
  if ($normalizado -eq ".publicador-cd-locacoes.json") { return $true }

  return $false
}

function Testar-CommitExiste {
  param([Parameter(Mandatory = $true)][string]$Hash)

  $resultado = Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("cat-file", "-e", "$Hash^{commit}") -PermitirFalha
  return $resultado.Codigo -eq 0
}

function Obter-InfoCommit {
  param([Parameter(Mandatory = $true)][string]$Hash)

  $linha = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("log", "-1", "--pretty=%H%x09%h%x09%s", $Hash)).Saida[0].ToString()
  $partes = $linha -split "`t", 3
  return [pscustomobject]@{
    HashCompleto = $partes[0]
    HashCurto = $partes[1]
    Mensagem = $partes[2]
  }
}

function Converter-DiffNameStatus {
  param([Parameter(Mandatory = $true)]$Linhas)

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

  return $arquivos
}

function Obter-PublicacaoPendente {
  param([Parameter(Mandatory = $true)][string]$HashBase)

  if (-not (Testar-CommitExiste -Hash $HashBase)) {
    throw "O hash de controle nao existe no repositorio de Desenvolvimento: $HashBase"
  }

  $headCompleto = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("rev-parse", "HEAD")).Saida[0].ToString().Trim()
  $headCurto = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("rev-parse", "--short", "HEAD")).Saida[0].ToString().Trim()
  $baseInfo = Obter-InfoCommit -Hash $HashBase

  if ($baseInfo.HashCompleto -eq $headCompleto) {
    return [pscustomobject]@{
      BaseHashCompleto = $baseInfo.HashCompleto
      BaseHashCurto = $baseInfo.HashCurto
      HeadHashCompleto = $headCompleto
      HeadHashCurto = $headCurto
      Commits = @()
      MensagemSugerida = "Publica atualizacoes aprovadas do Desenvolvimento"
      Arquivos = @()
    }
  }

  $linhasCommits = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("log", "--reverse", "--pretty=%H%x09%h%x09%s", "$($baseInfo.HashCompleto)..HEAD")).Saida
  $commits = @()
  foreach ($linha in $linhasCommits) {
    $texto = $linha.ToString()
    if (-not $texto.Trim()) { continue }
    $partes = $texto -split "`t", 3
    $commits += [pscustomobject]@{
      HashCompleto = $partes[0]
      HashCurto = $partes[1]
      Mensagem = $partes[2]
    }
  }

  $linhasDiff = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("diff", "--name-status", "-M", $baseInfo.HashCompleto, "HEAD")).Saida
  $arquivos = Converter-DiffNameStatus -Linhas $linhasDiff
  $mensagemSugerida = if ($commits.Count -eq 1) {
    $commits[0].Mensagem
  } else {
    "Publica atualizacoes aprovadas do Desenvolvimento"
  }

  return [pscustomobject]@{
    BaseHashCompleto = $baseInfo.HashCompleto
    BaseHashCurto = $baseInfo.HashCurto
    HeadHashCompleto = $headCompleto
    HeadHashCurto = $headCurto
    Commits = $commits
    MensagemSugerida = $mensagemSugerida
    Arquivos = $arquivos
  }
}

function Mostrar-Previa {
  param([Parameter(Mandatory = $true)]$Publicacao)

  if ($Publicacao.Commits.Count -eq 0) {
    Write-Host "A Producao ja esta sincronizada com o Desenvolvimento."
    Write-Host ""
    Write-Host "Nenhum commit pendente."
    Write-Host ""
    return
  }

  Write-Host "Commits ainda nao publicados:"
  Write-Host ""
  for ($indice = 0; $indice -lt $Publicacao.Commits.Count; $indice += 1) {
    $commit = $Publicacao.Commits[$indice]
    Write-Host "$($indice + 1). $($commit.HashCurto) - $($commit.Mensagem)"
  }
  Write-Host ""
  Write-Host "Arquivos que serao publicados:"
  Write-Host ""
  if ($Publicacao.Arquivos.Count -eq 0) {
    Write-Host "Nenhum arquivo valido para publicar."
  } else {
    foreach ($arquivo in $Publicacao.Arquivos) {
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

function Salvar-ControlePublicador {
  param([Parameter(Mandatory = $true)]$Controle)

  $Controle | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Producao $ControlePublicador) -Encoding UTF8
}

function Inicializar-ControlePublicador {
  param([switch]$Simulacao)

  Write-Host "Controle de publicacoes ainda nao inicializado."
  Write-Host ""
  Write-Host "1 - Marcar o HEAD atual como ja publicado"
  Write-Host "2 - Informar manualmente o commit de Desenvolvimento ja publicado"
  Write-Host "3 - Apenas simular escolhendo um commit inicial"
  Write-Host "4 - Sair"
  Write-Host ""

  do {
    $opcao = Read-Host "Escolha uma opcao"
  } while ($opcao -notin @("1", "2", "3", "4"))

  if ($opcao -eq "1") {
    if ($Simulacao) {
      Write-Host "No modo de simulacao esta opcao nao cria nem altera o controle."
      Write-Host "Para inicializar o controle, escolha Publicar em Producao e use esta opcao."
      return $null
    }

    Write-Host ""
    Write-Host "ATENCAO:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Use esta opcao somente se a Producao ja estiver completamente"
    Write-Host "sincronizada com todas as alteracoes atuais do Desenvolvimento."
    Write-Host ""
    Write-Host "Nenhum arquivo sera copiado nesta inicializacao."
    Write-Host ""
    $confirmacao = Read-Host "Digite CONFIRMAR para continuar"
    if ($confirmacao -ne "CONFIRMAR") {
      Write-Host "Inicializacao cancelada."
      return $null
    }

    Preparar-GitignoreProducao
    $headCompleto = (Invocar-Git -Repositorio $Desenvolvimento -Argumentos @("rev-parse", "HEAD")).Saida[0].ToString().Trim()
    $headInfo = Obter-InfoCommit -Hash $headCompleto
    $controle = [pscustomobject]@{
      ultimoCommitDesenvolvimentoPublicado = $headInfo.HashCompleto
      dataPublicacao = (Get-Date).ToString("o")
      mensagemCommitDesenvolvimento = $headInfo.Mensagem
      commitProducao = ""
      arquivosPublicados = @()
      mensagensCommitsDesenvolvimento = @($headInfo.Mensagem)
    }
    Salvar-ControlePublicador -Controle $controle
    Write-Host "Controle inicializado com o HEAD atual: $($headInfo.HashCurto)"
    return $null
  }

  if ($opcao -eq "2") {
    if ($Simulacao) {
      Write-Host "No modo de simulacao esta opcao nao cria nem altera o controle."
      Write-Host "Use a opcao 3 para simular a partir de um commit inicial."
      return $null
    }

    $hash = Read-Host "Informe o hash do commit de Desenvolvimento ja publicado"
    if (-not (Testar-CommitExiste -Hash $hash)) {
      throw "Commit informado nao existe no Desenvolvimento: $hash"
    }

    $info = Obter-InfoCommit -Hash $hash
    Write-Host ""
    Write-Host "Serao considerados pendentes todos os commits posteriores a:"
    Write-Host "$($info.HashCurto) - $($info.Mensagem)"
    Write-Host ""

    if (-not (Perguntar-SimNao -Mensagem "Gravar este hash como referencia?" -Padrao "N")) {
      Write-Host "Inicializacao cancelada."
      return $null
    }

    Preparar-GitignoreProducao
    $controle = [pscustomobject]@{
      ultimoCommitDesenvolvimentoPublicado = $info.HashCompleto
      dataPublicacao = (Get-Date).ToString("o")
      mensagemCommitDesenvolvimento = $info.Mensagem
      commitProducao = ""
      arquivosPublicados = @()
      mensagensCommitsDesenvolvimento = @($info.Mensagem)
    }
    Salvar-ControlePublicador -Controle $controle
    Write-Host "Controle inicializado com o commit informado: $($info.HashCurto)"
    return $null
  }

  if ($opcao -eq "3") {
    $hash = Read-Host "Informe o hash inicial para simulacao"
    $publicacao = Obter-PublicacaoPendente -HashBase $hash
    Mostrar-Previa -Publicacao $publicacao
    Write-Host "SIMULACAO: o controle nao foi criado nem alterado."
    return $null
  }

  Write-Host "Saindo sem alterar nada."
  return $null
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
    [Parameter(Mandatory = $true)]$Publicacao,
    [Parameter(Mandatory = $true)]$Arquivos,
    [string]$CommitProducao = ""
  )

  $mensagens = @($Publicacao.Commits | ForEach-Object { $_.Mensagem })
  $controle = [pscustomobject]@{
    ultimoCommitDesenvolvimentoPublicado = $Publicacao.HeadHashCompleto
    dataPublicacao = (Get-Date).ToString("o")
    mensagemCommitDesenvolvimento = ($mensagens -join " | ")
    arquivosPublicados = @($Arquivos | ForEach-Object { $_.Exibir })
    commitProducao = $CommitProducao
    mensagensCommitsDesenvolvimento = $mensagens
  }

  Salvar-ControlePublicador -Controle $controle
}

function Publicar {
  param([switch]$Simulacao)

  Mostrar-Cabecalho
  Testar-PreRequisitos
  Testar-DesenvolvimentoLimpo

  $controle = Obter-ControlePublicador
  if (-not $controle) {
    Inicializar-ControlePublicador -Simulacao:$Simulacao
    return
  }

  $hashBase = [string]$controle.ultimoCommitDesenvolvimentoPublicado
  if ([string]::IsNullOrWhiteSpace($hashBase)) {
    throw "Arquivo de controle existe, mas nao possui ultimoCommitDesenvolvimentoPublicado."
  }

  $publicacao = Obter-PublicacaoPendente -HashBase $hashBase
  Mostrar-Previa -Publicacao $publicacao

  if ($publicacao.Commits.Count -eq 0) {
    return
  }

  if ($publicacao.Arquivos.Count -eq 0) {
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

  if (-not (Perguntar-SimNao -Mensagem "Deseja copiar estes arquivos para Producao?" -Padrao "N")) {
    Write-Host "Operacao cancelada. Nada foi copiado."
    return
  }

  $pastaBackup = Join-Path (Join-Path $Producao $BackupPublicador) (Get-Date -Format "yyyy-MM-dd_HH-mm-ss")
  New-Item -ItemType Directory -Path $pastaBackup -Force | Out-Null
  $resultadoCopia = $null

  try {
    $resultadoCopia = Copiar-ComBackup -Arquivos $publicacao.Arquivos -PastaBackup $pastaBackup
    Validar-Copia -Arquivos $publicacao.Arquivos
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
  Write-Host $publicacao.MensagemSugerida
  if ($publicacao.Commits.Count -gt 1) {
    Write-Host ""
    Write-Host "Commits incluidos:"
    foreach ($commitPendente in $publicacao.Commits) {
      Write-Host "- $($commitPendente.Mensagem)"
    }
  }
  $mensagemCommit = Read-Host "Pressione ENTER para usar essa mensagem ou digite outra mensagem"
  if ([string]::IsNullOrWhiteSpace($mensagemCommit)) { $mensagemCommit = $publicacao.MensagemSugerida }
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
  Registrar-Publicacao -Publicacao $publicacao -Arquivos $publicacao.Arquivos -CommitProducao $hashProd

  Write-Host ""
  Write-Host "=================================================="
  Write-Host "       PUBLICACAO CONCLUIDA COM SUCESSO"
  Write-Host "=================================================="
  Write-Host ""
  Write-Host "Commit de Desenvolvimento: $($publicacao.HeadHashCurto)"
  Write-Host "Commit de Producao: $hashProd"
  Write-Host "Arquivos publicados: $($publicacao.Arquivos.Count)"
  Write-Host "Build: OK"
  Write-Host "Push: OK"
  Write-Host ""
  Write-Host "A Vercel de Producao iniciara o deploy automaticamente."
}

try {
  Mostrar-Cabecalho
  Testar-PreRequisitos

  if (-not (Obter-ControlePublicador)) {
    Inicializar-ControlePublicador
    return
  }

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

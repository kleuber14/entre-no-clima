# Entre no Clima — minigame de aquecimento

Projeto web simples (HTML, CSS, JavaScript puro) para a campanha de pesquisa de clima. Abre no navegador de celular ou computador e não requer instalação, API, login ou banco de dados.

## Rodar localmente

Abra `index.html` no navegador. Para um servidor local, use `python -m http.server 8000` nesta pasta e visite `http://localhost:8000`.

## Prévia privada e testes

Não é necessário publicar o jogo para testá-lo. Extraia o pacote da prévia e abra `index.html` no computador. Para testar pelo navegador de um celular, use uma prévia privada autorizada ou um servidor na sua rede local; o servidor restrito a `127.0.0.1` no ambiente em nuvem só fica acessível na própria máquina.

No ambiente em nuvem, execute nesta pasta:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Com Playwright e Chromium disponíveis, em outro terminal:

```sh
node tests/smoke.cjs
node tests/audio-smoke.cjs
```

O teste usa `/usr/bin/chromium` por padrão; `CHROMIUM_PATH` permite outro caminho e `GAME_URL` permite outra URL de teste. Os testes verificam quatro tamanhos de tela, imagens, destino da pesquisa, teclado/toque, captura positiva e negativa, limite de pontuação, retorno à partida, encerramento sem opção de jogar novamente e botão de som. Emulação não substitui uma rodada em Android e iPhone reais; a reprodução e o equilíbrio do áudio também devem ser conferidos no dispositivo. Os testes não enviam respostas à pesquisa.

## Como jogar

Toque em **Começar**, arraste o cesto com o dedo ou mouse (teclado: ← →, A D) e capture as peças verdes. Evite as vermelhas. A partida dura 25 segundos. A pesquisa fica acessível também sem jogar.

## Publicação via Codex / GitHub Pages

1. A branch `main` mantém o código e os testes; a branch `gh-pages` recebe o conteúdo desta pasta na raiz.
2. No GitHub: Settings > Pages > Deploy from a branch > gh-pages > /(root).
3. Compartilhe o endereço HTTPS resultante por QR Code ou WhatsApp.
4. Confirme o funcionamento em Android e iPhone antes da divulgação.

Pode-se também hospedar em Cloudflare Pages ou Netlify como site estático. Não há servidor a configurar.

## Decisões do protótipo

- Logo da campanha fornecida pelo solicitante; não utiliza a logo oficial isolada da empresa.
- Mascote fornecido, recortado no busto, usado apenas como narrador visual.
- Fundo com formas e estruturas de construção **sem nenhuma palavra**.
- Peças positivas: Respeito, Colaborar, Equipe, Cuidado, Mérito, Servir.
- Peças negativas: Desrespeito, Indiferença, Desunião, Descaso.
- Tela final: **Sua voz importa** / **Responder pesquisa**.
- Música instrumental original de 16 segundos em loop durante a partida: volume de 15%, reduzido para 4% durante a narração. Não utiliza música de terceiros.
- As duas gravações fornecidas substituem a voz sintetizada: `assets/audio/inicio.mp3` na abertura e `assets/audio/final.mp3` no encerramento. A trilha está em `assets/audio/musica.mp3`.
- O som inicia após tocar em **Começar**. O botão ♪ silencia ou reativa voz, música e efeitos. Ao terminar a partida, a música para e a gravação final é reproduzida. O áudio pausa quando a página fica em segundo plano.
- Não armazena nome, pontuação, resposta, IP, nem instala ferramenta de análise. O servidor de hospedagem pode manter logs próprios de acesso.
- O link da pesquisa é público e abre em nova aba; nenhuma resposta é coletada pelo minigame.
- O botão **Ir direto para a pesquisa** fica sempre disponível.

## Personalizar

- `game.js`: `DURATION_SECONDS`, listas de palavras e `FORM_URL`.
- `styles.css`: cores, tamanhos, composição do cenário.
- `assets/`: logo e busto do João; `assets/audio/`: as gravações fornecidas e a trilha instrumental original.

## Validação necessária antes do lançamento

Confira se o Google Forms está aceitando respostas e permissões corretas; valide legibilidade das palavras nos celulares da operação e configuração de som. Teste com 3–5 pessoas antes de distribuir para todas as unidades.

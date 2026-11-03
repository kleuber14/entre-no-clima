# Entre no Clima — minigame de aquecimento

Projeto web simples (HTML, CSS, JavaScript puro) para a campanha de pesquisa de clima. Abre no navegador de celular ou computador e não requer instalação, API, login ou banco de dados.

## Rodar localmente

Abra `index.html` no navegador. Para um servidor local, use `python -m http.server 8000` nesta pasta e visite `http://localhost:8000`.

## Como jogar

Toque em **Começar**, arraste o cesto com o dedo ou mouse (teclado: ← →, A D) e capture as peças verdes. Evite as vermelhas. A partida dura 25 segundos. A pesquisa fica acessível também sem jogar.

## Publicação via Codex / GitHub Pages

1. Suba o conteúdo desta pasta para um repositório GitHub.
2. No GitHub: Settings > Pages > Deploy from a branch > main > /(root).
3. Compartilhe o endereço HTTPS resultante por QR Code ou WhatsApp.
4. Confirme o funcionamento em Android e iPhone antes da divulgação.

Pode-se também hospedar em Cloudflare Pages ou Netlify como site estático. Não há servidor a configurar.

## Decisões do protótipo

- Logo da campanha fornecida pelo solicitante; não utiliza a logo oficial isolada da empresa.
- Mascote fornecido, recortado no busto, usado apenas como narrador visual.
- Fundo com formas e estruturas de construção **sem nenhuma palavra**.
- Peças positivas: Respeito, Escuta, Equipe, Cuidado, Mérito, Servir.
- Peças negativas: Desrespeito, Indiferença, Desunião, Descaso.
- Tela final: **Sua voz importa** / **Responder pesquisa**.
- Música de fundo não adicionada: para evitar direitos autorais e manter a experiência discreta. Há efeitos sonoros sintéticos; o botão ♪ ativa também narração em voz sintetizada do próprio dispositivo (a qualidade e a disponibilidade da voz pt-BR variam).
- Não armazena nome, pontuação, resposta, IP, nem instala ferramenta de análise. O servidor de hospedagem pode manter logs próprios de acesso.
- O link da pesquisa é público e abre em nova aba; nenhuma resposta é coletada pelo minigame.
- O botão **Ir direto para a pesquisa** fica sempre disponível.

## Personalizar

- `game.js`: `DURATION_SECONDS`, listas de palavras e `FORM_URL`.
- `styles.css`: cores, tamanhos, composição do cenário.
- `assets/`: logo e busto do João.

## Validação necessária antes do lançamento

Confira se o Google Forms está aceitando respostas e permissões corretas; valide legibilidade das palavras nos celulares da operação e configuração de som. Teste com 3–5 pessoas antes de distribuir para todas as unidades.

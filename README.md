## Licença

O **musicdl** é licenciado sob a **GNU GPLv3**.  
Isso significa que você pode usar, modificar e redistribuir o software, desde que preserve a mesma licença e atribua o copyright.

Este projeto utiliza as bibliotecas externas:

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — redistribuído conforme a licença do projeto.
- [FFmpeg](https://ffmpeg.org/) — redistribuído conforme a licença do projeto.

Para mais detalhes, consulte o arquivo `LICENSE` na raiz do projeto.

Há três forma de utilizar:
**Primeira:** node ./src/index.js "url" "URL do video" "artista"

**Segunda:** musicdl-npm "url" "URL do video" "artista"
         ou  musicdl "url" "URL do video" "artista"

para utilizar a segunda forma devo exercuta o comando npm install -g na raiz do projeto, certifique de exercutar como administrador 

**Terceiro:** ./musicdl "url" "URL do video" "artista" [linux] 
ou ./musicdl.exe "url" "URL do video" "artista" [windows]

para utilizar a terceira forma deve executar o comando **npm run build** para linux
ou **npm run build:win** para windows na raiz do projeto ou baixar o executavel da pasta exe/

após isso só é necessário mover o arquivo do exercutável para a pasta desejada
e abrir o terminal naquela pasta


**notas:**

os comandos devem vim entre aspás como nos exemplos acima,

as variável "artista" deve ser igual a que estar no titulo do video

ex: **titulo do video:** Numb - Linkin Park, **"artista":** "Linkin Park"

não é obrigatório, entretanto é necessário para uma boa formatação

usando o exemplo acima quando o video for baixado o titulo do arquivo vai ser alterado

para Linkin Park - Numb, claro se a variável "artista" não corresponder com a do titulo do video

o resultado será o seguinte: artista - Numb - Linkin Park

por fim tbm é possivel utilizar os comandos da ferramenta yt-dlp

digite: node ./src/index.js --help ou musicdl-npm --help para ver os comandos
#!/usr/bin/env node

/*
    Copyright (c) 2025 Jherison Mattheus Sousa Lemos

    Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo
    sob os termos da Licença Pública Geral conforme publicada pela
    Free Software Foundation, versão 3 da Licença.
*/

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const https = require("https");
const os = require("os");
const unzipper = require("unzipper");

const rootDir = path.resolve(__dirname, "..");

// binDir padrão (quando não empacotado)
let binDir = path.join(rootDir, "bin");

const isWin = process.platform === "win32";

// Quando empacotado com `pkg`, os arquivos dentro de /snapshot não podem ser
// executados diretamente. Copiamos o conteúdo de `bin/` para um diretório
// temporário e usamos os caminhos extraídos.
if (process.pkg) {
  const runtimeBinDir = path.join(os.tmpdir(), "musicdl-bin");

  function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const name of fs.readdirSync(src)) {
        copyRecursive(path.join(src, name), path.join(dest, name));
      }
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      try {
        fs.chmodSync(dest, 0o755);
      } catch (e) {
        // ignore chmod errors on platforms that don't support it
      }
    }
  }

  // Sempre usar runtimeBinDir quando empacotado, pois /snapshot é read-only
  binDir = runtimeBinDir;

  try {
    const packagedBin = path.join(rootDir, "bin");
    if (fs.existsSync(packagedBin)) {
      copyRecursive(packagedBin, runtimeBinDir);
    }
  } catch (err) {
    // se falhou, continuamos pois binários serão baixados
    // console.error("Falha ao extrair binários empacotados:", err.message);
  }
}

const ffmpegDir = path.join(binDir, "ffmpeg");
const ffmpegPath = path.join(ffmpegDir, isWin ? "ffmpeg.exe" : "ffmpeg");
const ytDlpPath = path.join(binDir, isWin ? "yt-dlp.exe" : "yt-dlp");

function printYTDLPNotice() {
  console.log(`
musicdl é um wrapper que utiliza a ferramenta yt-dlp.

Projeto oficial do yt-dlp:
https://github.com/yt-dlp/yt-dlp

Todos os argumentos iniciados com "-" são repassados diretamente para o yt-dlp.
`);
}

function normalize(str) {
  return str.toLowerCase().replace(/['"]/g, "").replace(/\s+/g, " ").trim();
}

function padronizarNomeArquivo(nomeArquivo, artista) {
  const ext = path.extname(nomeArquivo);
  const base = path.basename(nomeArquivo, ext);

  const normBase = normalize(base);
  const normArtista = normalize(artista);

  const dashPatterns = [" - ", " – "];

  for (const dash of dashPatterns) {
    if (normBase.startsWith(normArtista + dash) || !base.startsWith(artista) && base.includes(dash)) {
      if (!base.startsWith(artista)) {
            const musica = base
              .slice(base.lastIndexOf(dash) + dash.length)
              .trim()
              .toLowerCase()
              .replace(/(^|\s)\p{L}/gu, c => c.toUpperCase());
            console.log(musica);
            return `${artista} - ${musica}${ext}`;
        }
      console.log(base);
      return nomeArquivo;
    }

    if (normBase.endsWith(dash + normArtista)) {
      const musica = base
        .slice(0, base.lastIndexOf(dash))
        .trim()
        .toLowerCase()
        .replace(/(^|\s)\p{L}/gu, c => c.toUpperCase());
      console.log(musica);
      return `${artista} - ${musica}${ext}`;
    }
  }
  base
  .toLowerCase()
  .replace(/(^|\s)\p{L}/gu, c => c.toUpperCase());
  console.log(base);
  return `${artista} - ${base}${ext}`;
}

function baixarffmpeg() {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(ffmpegDir, { recursive: true });

    const url = isWin
      ? "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
      : "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz";

    const archive = path.join(binDir, isWin ? "ffmpeg.zip" : "ffmpeg.tar.xz");
    const file = fs.createWriteStream(archive);

    function get(urlToGet) {
      https
        .get(urlToGet, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // segue redirect
            get(res.headers.location);
          } else if (res.statusCode === 200) {
            res.pipe(file);
            file.on("finish", () => {
              try {
                if (isWin) {
                  fs.createReadStream(archive)
                    .pipe(unzipper.Extract({ path: ffmpegDir }))
                    .on("close", () => {
                      const extractedDir = fs
                        .readdirSync(ffmpegDir)
                        .find(
                          (d) =>
                            d.startsWith("ffmpeg") &&
                            fs.statSync(path.join(ffmpegDir, d)).isDirectory()
                        );

                      const binPath = path.join(ffmpegDir, extractedDir, "bin");

                      fs.renameSync(
                        path.join(binPath, "ffmpeg.exe"),
                        path.join(ffmpegDir, "ffmpeg.exe")
                      );
                      fs.renameSync(
                        path.join(binPath, "ffprobe.exe"),
                        path.join(ffmpegDir, "ffprobe.exe")
                      );
                      fs.rmSync(path.join(ffmpegDir, extractedDir), {
                        recursive: true,
                        force: true,
                      });
                      fs.unlinkSync(archive);
                      resolve();
                    })
                    .on("error", (err) => {
                      fs.unlinkSync(archive);
                      reject(err);
                    });
                } else {
                  execSync(`tar -xf "${archive}" -C "${ffmpegDir}"`);

                  const extractedDir = fs
                    .readdirSync(ffmpegDir)
                    .find(
                      (d) =>
                        d.startsWith("ffmpeg") &&
                        fs.statSync(path.join(ffmpegDir, d)).isDirectory()
                    );

                  const extractedPath = path.join(ffmpegDir, extractedDir);

                  fs.renameSync(
                    path.join(extractedPath, "ffmpeg"),
                    path.join(ffmpegDir, "ffmpeg")
                  );
                  fs.renameSync(
                    path.join(extractedPath, "ffprobe"),
                    path.join(ffmpegDir, "ffprobe")
                  );

                  fs.chmodSync(path.join(ffmpegDir, "ffmpeg"), 0o755);
                  fs.chmodSync(path.join(ffmpegDir, "ffprobe"), 0o755);

                  fs.rmSync(extractedPath, { recursive: true, force: true });
                  fs.unlinkSync(archive);
                  resolve();
                }
              } catch (err) {
                reject(err);
              }
            });
            file.on("error", reject);
          } else {
            reject(new Error(`Download failed with status ${res.statusCode}`));
          }
        })
        .on("error", reject);
    }

    get(url);
  });
}

function baixarYTDLP() {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(binDir, { recursive: true });
    const file = fs.createWriteStream(ytDlpPath);

    const url = isWin
      ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
      : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

    function get(urlToGet) {
      https
        .get(urlToGet, (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            get(res.headers.location);
          } else if (res.statusCode === 200) {
            res.pipe(file);
            file.on("finish", () => {
              if (!isWin) fs.chmodSync(ytDlpPath, 0o755);
              resolve();
            });
            file.on("error", reject);
          } else {
            reject(new Error(`Falha no download: ${res.statusCode}`));
          }
        })
        .on("error", reject);
    }

    get(url);
  });
}

async function baixarMusica(url, artista) {
  const pastaMusicas = path.join(process.cwd(), "musicas");
  fs.mkdirSync(pastaMusicas, { recursive: true });

  const yt = spawn(
    ytDlpPath,
    [
      "-x",
      "--ffmpeg-location",
      ffmpegDir,
      "--audio-format",
      "mp3",
      "--embed-metadata",
      "--replace-in-metadata",
      "title",
      "\\s*\\(.*?\\)|\\s*\\[.*?\\]",
      "",
      "--sponsorblock-remove",
      "intro,music_offtopic",
      "--force-keyframes-at-cuts",
      "-o",
      `${artista}/%(title)s.%(ext)s`,
      url,
    ],
    { cwd: pastaMusicas }
  );

  yt.stdout.on("data", (d) => console.log(d.toString()));
  yt.stderr.on("data", (e) => console.error(e.toString()));

  yt.on("close", (code) => {
    console.log("Finalizado com código:", code);
    const dir = path.join(pastaMusicas, artista);

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".mp3")) continue;
      const novoNome = padronizarNomeArquivo(file, artista);
      if (novoNome !== file) {
        fs.renameSync(path.join(dir, file), path.join(dir, novoNome));
      }
    }
    printYTDLPNotice();
  });
}

(async function main() {
  try {
    if (!fs.existsSync(ytDlpPath)) {
      console.log("Baixando yt-dlp...");
      await baixarYTDLP();
    }

    if (!fs.existsSync(ffmpegPath)) {
      console.log("Baixando ffmpeg...");
      await baixarffmpeg();
    }

    const arg = process.argv[2];
    let artista;
    let url;

    if (!arg) {
      console.log("Uso: musicdl url <URL> artista <artista>");
      console.log("Ajuda: musicdl --help");
      printYTDLPNotice();
      process.exit(1);
    }

    const args = process.argv.slice(2);

    if (args[0].startsWith("-")) {
      const pastaMusicas = path.join(process.cwd(), "musicas");
      fs.mkdirSync(pastaMusicas, { recursive: true });

      const yt = spawn(ytDlpPath, args, { cwd: pastaMusicas });

      yt.stdout.on("data", (d) => console.log(d.toString()));
      yt.stderr.on("data", (e) => console.error(e.toString()));

      yt.on("close", (code) => {
        console.log("Finalizado com código:", code);
      });
      printYTDLPNotice();
      return;
    }

    if (arg === "url") {
      url = process.argv[3];
      artista = process.argv[4];
      console.log(url, artista);
      await baixarMusica(url, artista);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

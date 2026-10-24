// Levanta el dev server de Angular y un Cloudflare Quick Tunnel (*.trycloudflare.com) en paralelo.
// Uso: npm run tunnel   (Ctrl+C corta los dos procesos)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const PUERTO = 4200;
const require = createRequire(import.meta.url);

/** cloudflared puede no estar en el PATH de terminales abiertas antes de instalarlo. */
function rutaCloudflared() {
  const candidatos = [
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
  ];
  return candidatos.find((ruta) => existsSync(ruta)) ?? 'cloudflared';
}

const procesos = [];
let cerrando = false;

function cerrarTodo(codigo = 0) {
  if (cerrando) return;
  cerrando = true;
  for (const proceso of procesos) {
    if (proceso.exitCode === null) proceso.kill();
  }
  process.exit(codigo);
}

function lanzar(nombre, comando, args, alSalida) {
  const proceso = spawn(comando, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  procesos.push(proceso);

  const prefijar = (destino) => (datos) => {
    const texto = datos.toString();
    for (const linea of texto.split(/\r?\n/).filter(Boolean)) {
      destino.write(`[${nombre}] ${linea}\n`);
    }
    alSalida?.(texto);
  };

  proceso.stdout.on('data', prefijar(process.stdout));
  proceso.stderr.on('data', prefijar(process.stderr));
  proceso.on('error', (error) => {
    console.error(`[${nombre}] No se pudo iniciar: ${error.message}`);
    cerrarTodo(1);
  });
  proceso.on('exit', (codigo) => {
    if (!cerrando) {
      console.error(`[${nombre}] terminó (código ${codigo}); cerrando el resto.`);
      cerrarTodo(codigo ?? 1);
    }
  });

  return proceso;
}

const ngCli = require.resolve('@angular/cli/bin/ng.js');
lanzar('front', process.execPath, [ngCli, 'serve', '--host', '0.0.0.0', '--port', String(PUERTO)]);

let urlMostrada = false;
lanzar('tunel', rutaCloudflared(), ['tunnel', '--url', `http://localhost:${PUERTO}`], (texto) => {
  // Excluye api.trycloudflare.com, que aparece en los mensajes de error y no es la URL del túnel
  const url = texto.match(/https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/)?.[0];
  if (url && !urlMostrada) {
    urlMostrada = true;
    const linea = '='.repeat(url.length + 8);
    console.log(`\n${linea}\n    ${url}\n${linea}\n  URL pública del túnel (válida mientras este proceso siga corriendo)\n`);
  }
});

process.on('SIGINT', () => cerrarTodo(0));
process.on('SIGTERM', () => cerrarTodo(0));

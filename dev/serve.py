# Servidor de desenvolvimento do jogo: igual ao "python -m http.server", mas diz ao navegador
# para NUNCA guardar os ficheiros em cache ("Cache-Control: no-store").
# Porquê? O http.server normal não manda esse aviso, e o navegador guardava os módulos .js
# antigos: depois de mudarmos uma regra (ex.: src/sim/fire.js), o jogo continuava a correr a
# versão velha e julgávamos a dificuldade com código antigo.
# Usar (na pasta do projeto):  python dev/serve.py        e abrir http://localhost:8000/
# Outra porta:                 python dev/serve.py 8080
import functools
import http.server
import os
import sys

# A pasta do projeto (a pasta acima de dev/), para servir sempre a partir dela.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Antes de fechar os cabeçalhos da resposta, junta o "não guardes isto".
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(('', port), handler) as server:
        print(f'Serving {ROOT} at http://localhost:{port}/ (no cache)')
        server.serve_forever()

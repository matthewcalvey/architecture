require 'socket'

root = '/Users/matt/Desktop/CALVEY_ARCHIVE/form_versions/CALVEY_FORM_v1'

server = TCPServer.new('127.0.0.1', 3456)
$stdout.puts "Serving on http://127.0.0.1:3456"
$stdout.flush

loop do
  client = server.accept
  request = client.gets
  next client.close unless request

  path = request.split(' ')[1]
  path = '/02_PROGRAM.html' if path == '/'

  file_path = File.join(root, path)

  if File.exist?(file_path) && !File.directory?(file_path)
    body = File.read(file_path)
    ext = File.extname(file_path)
    content_type = case ext
    when '.html' then 'text/html'
    when '.css' then 'text/css'
    when '.js' then 'application/javascript'
    when '.json' then 'application/json'
    when '.png' then 'image/png'
    when '.jpg', '.jpeg' then 'image/jpeg'
    when '.gif' then 'image/gif'
    when '.svg' then 'image/svg+xml'
    when '.woff', '.woff2' then 'font/woff2'
    else 'application/octet-stream'
    end
    client.print "HTTP/1.1 200 OK\r\nContent-Type: #{content_type}\r\nContent-Length: #{body.bytesize}\r\nConnection: close\r\n\r\n"
    client.print body
  else
    msg = "Not Found"
    client.print "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: #{msg.bytesize}\r\nConnection: close\r\n\r\n#{msg}"
  end
  client.close
end

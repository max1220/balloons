#!/usr/bin/env lua

local json = require("cjson")

local config = {
  path = "/home/max/Stuff/balloons/",
  logfile = "log.txt",
  scorefile = "score.txt"
}

function template(body, title)
  local template = [===[Content-type: text/html

  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>{{title}}</title>
      <style>
        html, body {s
          /* From bootstrap */
          color: #333;
          font-family: "Helvetica Neue",Helvetica,Arial,sans-serif;
          line-height: 1.42857143;
          font-size: 14px;
        }
        .highscore {
          margin-top: 10px;
          width: 100%;
          border: 1px solid #ddd;
        }
        .highscore > tbody > tr {
          height: 2em;
        }
        .highscore > tbody > tr > th {
          border-bottom: 1px solid #ddd;
          text-align: left;
          padding-left: 0.5em;
        }
        .highscore > tbody > tr > td {
          padding-left: 1em;
        }
      </style>
    </head>
    <body>
      {{body}}
    </body>
  </html>

  ]===]
  if type(title) == "string" then
    return (template:gsub("{{title}}", "Balloons - " .. title):gsub("{{body}}", "\n" .. body .. "\n"))
  else
    return (template:gsub("{{title}}", "Balloons"):gsub("{{body}}", "\n" .. body .. "\n"))
  end
end




if config.logfile then
  function log(...)
    local logfile = io.open(config.path .. config.logfile, "a")
    if logfile then
      local t = {}
      for k,v in pairs({...}) do
        t[tonumber(k)] = tostring(v)
      end
      logfile:write(os.date() .. " - " .. table.concat(t, "\t"), "\n")
      logfile:close()
    end
  end
  function logf(str, ...)
    log(str:format(...))
  end
else
  function log(...) end
  logf = log
end




function htmlescape(str)
	str = str:gsub("&", "&amp;")
  for k,v in pairs({
  	["<"] = "&lt;",
  	[">"] = "&gt;",
  	['"'] = "&quot;",
  	["'"] = "&#39;",
  	["Ä"] = "&Auml;",
  	["ä"] = "&auml;",
  	["Ö"] = "&Ouml;",
  	["ö"] = "&ouml;",
  	["Ü"] = "&Uuml;",
  	["ü"] = "&uuml;"
  }) do
    str = str:gsub(k,v)
  end
  return str
end


function unescape (str)
  str = string.gsub(str, "+", " ")
  str = string.gsub(str, "%%(%x%x)", function (h)
    return string.char(tonumber(h, 16))
  end)
  return str
end

function urldecode(str)
  local parms = {}
  for name, value in str:gfind("([^&=]+)=([^&=]+)") do
    local name = unescape(name)
    local value = unescape(value)
    parms[name] = value
  end
  return parms
end

function urlencode(str)
  if (str) then
    str = string.gsub (str, "\n", "\r\n")
    str = string.gsub (str, "([^%w %-%_%.%~])", function (c)
      return string.format ("%%%02X", string.byte(c))
    end)
    str = string.gsub (str, " ", "+")
  end
  return str
end

function httperror(title, str)
  local title = tostring(title)
  if str then
    log("ERROR: " .. title .. " :" .. tostring(str))
    -- return ("Content-type: text/html\n\n<h1>%s</h1>\n<p>%s</p>\n"):format(title, str)
    return template(("<h1>Error: %s</h1>\n<pre>%s</pre>\n"):format(htmlescape(title), htmlescape(str)),htmlescape(title))
  else
    log("ERROR: " .. title)
    return template(("<h1>Error</h1>\n<pre>%s</pre>\n"):format(htmlescape(title)))
  end
end

function addEntry(name, game_config, game_state)
  assert(type(name) == "string")
  assert(type(game_config) == "table")
  assert(type(game_state) == "table")
  assert(tonumber(game_state.total_popped))

  local scorefile = assert(io.open(config.path .. config.scorefile, "a"))
  scorefile:write(urlencode(name) .. "!" .. os.time() .. "!" .. game_state.total_popped .. "\n")
  scorefile:close()
  logf("Added highscore entry for %s (score: %d)", name, tonumber(game_state.total_popped))
  return true
end

function getEntrys()
  local entrys = {}
  for line in io.lines(config.path .. config.scorefile) do
    if line and #line >= 1 then
      local name,time,popped = line:match("(.*)!(%d*)!(%d*)")
      if name and tonumber(time) and tonumber(popped) then
        entrys[#entrys + 1] = {name=name, time=time, popped=popped}
      end
    end
  end
  return entrys
end

function getEntrysTime()
  entrys = getEntrys()
  table.sort(entrys, function(a, b)
    if a.time > b.time then
      return true
    end
  end)
  return entrys
end

function getEntrysScore()
  entrys = getEntrys()
  table.sort(entrys, function(a, b)
    if tonumber(a.popped) > tonumber(b.popped) then
      return true
    end
  end)
  return entrys
end




function http_GET(parms)
  log("GET")
  entrys = getEntrysScore()
  --local str = "<h1>Highscore(1-10) by score!</h1>\n<a href=\"../score.txt\">complete highscore dump</a>\n<pre>\n"
  local str = "<h1>Highscore(1-10) by score</h1>\n<a href=\"../score.txt\">complete highscore dump</a>\n<table class=\"highscore\">\n\t<tr>\n\t\t<th><b>Name</b></th>\n\t\t<th><b>Date</b></th>\n\t\t<th><b>Score</b></th>\n\t</tr>\n"
  for i=1, 10 do
    local centry = entrys[i]
    if centry then
      --str = str .. ("[%s] %s (%d)\n"):format(os.date("%c", centry.time), htmlescape(centry.name), centry.popped)
      str = str .. ("\t<tr>\n\t\t<td>%s</td>\n\t\t<td>%s</td>\n\t\t<td>%d</td>\n\t</tr>\n"):format(htmlescape(centry.name), os.date("%c", centry.time), centry.popped)
    else
      break
    end
  end
  str = str .. "</table>\n<p>total entrys: <b>" .. #entrys .. "</b></p>"
  return template(str, "highscore")
end

function http_POST(parms, body)
  log("POST")
  local valid_config, config = pcall(json.decode, body.config)
  local valid_state, state = pcall(json.decode, body.state)
  if valid_config and valid_state then
    local ok, ret = pcall(addEntry, body.name, config, state)
    if ok then
      return http_GET(parms)
    else
      return httperror("Bad Entry! Error: " .. tostring(ret))
    end
  else
    return httperror("Invalid JSON!")
  end

end




log(("="):rep(40))
log("Started!")
if _G["http_" .. tostring(os.getenv("REQUEST_METHOD"))] then
  -- Diabolic...
  io.write((_G["http_" .. os.getenv("REQUEST_METHOD")](urldecode(os.getenv("QUERY_STRING") or ""), urldecode(io.read("*a") or ""))))
else
  io.write("Content-type: text/html\n\n<h1>Unknown method!</h1>")
end
io.close()

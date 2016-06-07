REM Replace body color:
call convert.exe balloon_prototype.png -fill %2 -opaque rgb(237,28,36) PNG:out\balloon_%1.png

REM Replace light color:
call convert.exe out\balloon_%1.png -fill %3 -opaque rgb(255,174,201) PNG:out\balloon_%1.png

start = start:(literal / literals / block / ";;" { return ";" } / [^{}])* { return start.join(''); }

block = block:('{' start '}') { return block.join(''); }

literal
  = ':' [ \n]* '{' [\n ]* '"@":' [ \n]* '"' literal:$([^\\"] / '\\"' / "\\")* '"' [\n ]* '}' { return ": " + literal.trim(); }
  / '{' [\n ]* '"@":' [ \n]* '"' literal:$([^\\"] / '\\"' / "\\")* '"' [\n ]* '}' { return literal.trim(); }

literals
  = ('{' vals:$([A-za-z_$., \n])+ '}' [ \n]+ 'from '
  {
    return '{ ' + vals.trim().replace(/\n/mg, ' ').replace(/ +/g, ' ').replace(/ ,/g, ',').replace(/^ +| +$/, '') + ' } from ';
  })
  / ('{' vals:$([A-za-z_$., \n])+ '}'
  {
    return '{ ' + vals.trim().replace(/\n/mg, ' ').replace(/ +/g, ' ').replace(/ ,/g, ',').replace(/^ +| +$/, '') + ' }';
  })
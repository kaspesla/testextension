from PIL import Image
from bitstring import BitArray
import sys
im = Image.open(sys.argv[1])
pix = im.load()
w=im.size[0]
h=im.size[1]

s = BitArray(bytearray([w,h]));

bits = [ ]
for j in range(h):
#  print " "
  for i in range(w):
    if len(bits) == 8:
       s += bits 
       bits = [ ]
    if pix[i,j] == 1:
      bits.insert(0,0)
#      sys.stdout.write('  ')
    else:
      bits.insert(0,1)
#      sys.stdout.write('* ')

f = open('cat.rgf', 'wb')
s.tofile(f)

print s.hex

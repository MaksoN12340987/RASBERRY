n=0

while [ n ]

do
echo $n	
i2cset -y 1 0x64 0x10 195

sleep 90

i2cset -y 1 0x64 0x10 0

sleep 60

i2cset -y 1 0x64 0x10 166

sleep 90

i2cset -y 1 0x64 0x10 0

sleep 60

i2cset -y 1 0x64 0x10 153

sleep 90

i2cset -y 1 0x64 0x10 0

sleep 60
n=$(( $n + 1 ))
done
#!/bin/bash

#pdftk 1966_6_ak_4_Voteringsprotokoll.pdf burst output ./output/page_%03d.pdf

for file in ./pdf/*.pdf
do
	name=`basename ${file} .pdf`
	echo "converting to single page pdf $file"
	pdftk "${file}" burst output "./single_page_pdf/${name}_%03d.pdf"
done

for file in ./single_page_pdf/*.pdf
do
	name=`basename ${file} .pdf`
	echo "converting to png $file"
	sips -s format png --out "./png/${name}.png" ${file}
done
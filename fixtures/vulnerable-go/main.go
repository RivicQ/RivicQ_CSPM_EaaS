package main

import (
	"crypto/md5"
	"fmt"
)

func main() {
	sum := md5.Sum([]byte("fixture"))
	fmt.Printf("%x\n", sum)
}

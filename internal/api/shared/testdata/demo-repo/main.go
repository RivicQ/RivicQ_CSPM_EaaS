// SYNTHETIC DEMO — RSA usage for CBOM detection. Not production code.
package main

import (
	"crypto/md5"
	"crypto/rsa"
	"fmt"
)

func main() {
	_ = rsa.GenerateKey
	sum := md5.Sum([]byte("demo"))
	fmt.Printf("%x\n", sum)
}

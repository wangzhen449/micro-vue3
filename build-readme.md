安装 typescript minimist(命令行解析工具) esbuild(打包工具)
```
pnpm install typescript minimist esbuild -w -D
```

package.json 中添加build信息
``` json
"buildOptions": {
  "name": "VueReactivity", // 暴露的包名
  "formats": [             // 文件格式
    "global",              // 全局使用格式
    "cjs",                 // commonjs
    "esm-bundler"          // 浏览器使用的格式
  ]
}
```
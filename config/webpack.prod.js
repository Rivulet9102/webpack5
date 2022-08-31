// nodejs核心模块，直接使用
const os = require("os");
// cpu核数
const threads = os.cpus().length;

const path = require('path'); // nodejs核心模块，专门处理路径逻辑
const ESLintWebpackPlugin = require("eslint-webpack-plugin"); // 引入eslint插件
const HtmlWebpackPlugin = require("html-webpack-plugin"); // 引入插件：在body中使用scipt标签引入所有webpack生成的bundle
const MiniCssExtractPlugin = require("mini-css-extract-plugin"); // 提取css到单独文件，为每个包含css的js创建单独的css文件，支持css按需加载
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin"); //css压缩插件
const TerserPlugin = require("terser-webpack-plugin"); // 多线程打包
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
const PreloadWebpackPlugin = require("@vue/preload-webpack-plugin"); // 预加载
const WorkboxPlugin = require("workbox-webpack-plugin"); // 离线缓存（PWA）

// 获取处理样式的Loaders
const getStyleLoaders = (preProcessor) => {
    return [
        MiniCssExtractPlugin.loader,
        "css-loader",
        {
            loader: "postcss-loader",
            options: {
                postcssOptions: {
                    plugins: [
                        "postcss-preset-env", // 能解决大多数样式兼容性问题
                    ],
                },
            },
        },
        preProcessor,
    ].filter(Boolean);
};

module.exports = {
    // 入口
    entry: "./src/main.js", // 相对路径
    // entry: {
    //     main: "./src/main.js",
    //     app: "./src/app.js"
    // },
    // 输出
    output: {
        // 文件的输出路径
        // path: "",
        // __dirname nodejs变量，代表当前文件的文件夹目录
        path: path.resolve(__dirname, '../dist'), //绝对路径
        // 入口文件打包输出文件名
        filename: "static/js/[name].[hash].js", // 将 js 文件输出到 static/js 目录中
        // chunkFilename: "static/js/[name].[hash].js", // 动态导入输出资源命名方式
        // assetModuleFilename: "static/media/[name].[hash][ext]", // 图片、字体等资源命名方式（注意用hash）
        // [contenthash:8]使用contenthash，取8位长度
        filename: "static/js/[name].[contenthash:8].js", // 入口文件打包输出资源命名方式
        chunkFilename: "static/js/[name].[contenthash:8].chunk.js", // 动态导入输出资源命名方式
        clean: true, // 自动将上次打包目录资源清空
        environment: {
            arrowFunction: false, //关闭箭头函数输出
        }
    },
    // 加载器
    module: {
        rules: [
            // loader的配置
            {
                oneOf: [{
                        // 用来匹配 .css 结尾的文件
                        test: /\.css$/,
                        // use 数组里面 Loader 执行顺序是从右到左
                        // css-loader 将css资源编译成commonjs的模块到js中
                        // style-loader 将js中css通过创建style标签添加html文件中生效
                        use: getStyleLoaders(),
                    },
                    {
                        // 用来匹配 .less 结尾的文件
                        test: /\.less$/,
                        use: getStyleLoaders("less-loader"),
                    },
                    {
                        test: /\.s[ac]ss$/,
                        use: getStyleLoaders("sass-loader"),
                    },
                    {
                        test: /\.styl$/,
                        use: getStyleLoaders("stylus-loader"),
                    },
                    {
                        test: /\.(png|jpe?g|gif|webp)$/,
                        type: "asset",
                        parser: {
                            dataUrlCondition: {
                                maxSize: 60 * 1024 // 小于10kb的图片会被base64处理
                            }
                        },
                        generator: {
                            // 将图片文件输出到 static/imgs 目录中
                            // 将图片文件命名 [hash:8][ext][query]
                            // [hash:8]: hash值取8位
                            // [ext]: 使用之前的文件扩展名
                            // [query]: 添加之前的query参数
                            filename: "static/imgs/[hash:8][ext][query]",
                        },
                    },
                    {
                        test: /\.(ttf|woff2?|map4|map3|avi)$/,
                        type: "asset/resource",
                        generator: {
                            filename: "static/media/[hash:8][ext][query]",
                        },
                    },
                    {
                        test: /\.(ttf|woff2?|map4|map3|avi)$/,
                        type: "asset/resource",
                        generator: {
                            filename: "static/media/[hash:8][ext][query]",
                        },
                    },
                    {
                        test: /\.js$/,
                        // exclude: /node_modules/, // 排除node_modules代码不编译
                        include: path.resolve(__dirname, "../src"),
                        use: [{
                                loader: "thread-loader", // 开启多进程
                                options: {
                                    workers: threads, // 数量
                                },
                            },
                            {
                                loader: "babel-loader",
                                options: {
                                    presets: [
                                        ["@babel/preset-env",
                                            // 自动按需加载core-js的polyfill
                                            {
                                                useBuiltIns: "usage",
                                                corejs: {
                                                    version: "3.8",
                                                    proposals: true
                                                }
                                            },
                                        ]
                                    ],
                                    cacheDirectory: true, // 开启babel编译缓存
                                    cacheCompression: false, // 缓存文件不要压缩
                                    plugins: ["@babel/plugin-transform-runtime"], // 减少代码体积
                                }
                            },
                        ],

                    },
                ]
            }
        ],
    },
    // 插件
    plugins: [
        // 插件
        new ESLintWebpackPlugin({
            // 指定检查文件的根目录
            context: path.resolve(__dirname, "../src"),
            exclude: "node_modules", // 默认值
            cache: true, // 开启缓存
            // 缓存目录
            cacheLocation: path.resolve(
                __dirname,
                "../node_modules/.cache/.eslintcache"
            ),
            threads, // 开启多进程
        }),
        new HtmlWebpackPlugin({
            // 以 public/index.html 为模板创建文件
            // 新的html文件有两个特点：1. 内容和源文件一致 2. 自动引入打包生成的js等资源
            template: path.resolve(__dirname, "../public/index.html"),
        }),
        // 提取css成单独文件
        new MiniCssExtractPlugin({
            // 定义输出文件名和目录
            // filename: "static/css/main.css",
            filename: "static/css/[name].[contenthash:8].css",
            chunkFilename: "static/css/[name].[contenthash:8].chunk.css",
        }),
        // css压缩
        new PreloadWebpackPlugin({
            rel: "preload", // preload兼容性更好
            as: "script",
            // rel: 'prefetch' // prefetch兼容性更差
        }),
        new WorkboxPlugin.GenerateSW({
            // 这些选项帮助快速启用 ServiceWorkers
            // 不允许遗留任何“旧的” ServiceWorkers
            clientsClaim: true,
            skipWaiting: true,
        }),
    ],
    // 模式
    mode: 'production',
    devtool: "source-map", // 包含行/列映射
    optimization: {
        minimize: true,
        // minimizer: [
        //     // css压缩也可以写到optimization.minimizer里面，效果一样的
        //     new CssMinimizerPlugin(),
        //     // 当生产模式会默认开启TerserPlugin，但是我们需要进行其他配置，就要重新写了
        //     new TerserPlugin({
        //         parallel: threads // 开启多进程
        //     }),
        //     // 压缩图片
        //     new ImageMinimizerPlugin({
        //         minimizer: {
        //             implementation: ImageMinimizerPlugin.imageminGenerate,
        //             options: {
        //                 plugins: [
        //                     ["gifsicle", {
        //                         interlaced: true
        //                     }],
        //                     ["jpegtran", {
        //                         progressive: true
        //                     }],
        //                     ["optipng", {
        //                         optimizationLevel: 5
        //                     }],
        //                     [
        //                         "svgo",
        //                         {
        //                             plugins: [
        //                                 "preset-default",
        //                                 "prefixIds",
        //                                 {
        //                                     name: "sortAttrs",
        //                                     params: {
        //                                         xmlnsOrder: "alphabetical",
        //                                     },
        //                                 },
        //                             ],
        //                         },
        //                     ],
        //                 ],
        //             },
        //         },
        //     }),
        // ],
        // 代码分割配置
        // splitChunks: {
        //     chunks: "all", // 对所有模块都进行分割
        //     // 以下是默认值
        //     // minSize: 20000, // 分割代码最小的大小
        //     // minRemainingSize: 0, // 类似于minSize，最后确保提取的文件大小不能为0
        //     // minChunks: 1, // 至少被引用的次数，满足条件才会代码分割
        //     // maxAsyncRequests: 30, // 按需加载时并行加载的文件的最大数量
        //     // maxInitialRequests: 30, // 入口js文件最大并行请求数量
        //     // enforceSizeThreshold: 50000, // 超过50kb一定会单独打包（此时会忽略minRemainingSize、maxAsyncRequests、maxInitialRequests）
        //     // cacheGroups: { // 组，哪些模块要打包到一个组
        //     //   defaultVendors: { // 组名
        //     //     test: /[\\/]node_modules[\\/]/, // 需要打包到一起的模块
        //     //     priority: -10, // 权重（越大越高）
        //     //     reuseExistingChunk: true, // 如果当前 chunk 包含已从主 bundle 中拆分出的模块，则它将被重用，而不是生成新的模块
        //     //   },
        //     //   default: { // 其他没有写的配置会使用上面的默认值
        //     //     minChunks: 2, // 这里的minChunks权重更大
        //     //     priority: -20,
        //     //     reuseExistingChunk: true,
        //     //   },
        //     // },
        //     // 修改配置
        //     cacheGroups: {
        //         // 组，哪些模块要打包到一个组
        //         // defaultVendors: { // 组名
        //         //   test: /[\\/]node_modules[\\/]/, // 需要打包到一起的模块
        //         //   priority: -10, // 权重（越大越高）
        //         //   reuseExistingChunk: true, // 如果当前 chunk 包含已从主 bundle 中拆分出的模块，则它将被重用，而不是生成新的模块
        //         // },
        //         default: {
        //             // 其他没有写的配置会使用上面的默认值
        //             minSize: 0, // 我们定义的文件体积太小了，所以要改打包的最小文件体积
        //             minChunks: 2,
        //             priority: -20,
        //             reuseExistingChunk: true,
        //         },
        //     },
        // },
        runtimeChunk: {
            name: (entrypoint) => `runtime~${entrypoint.name}.js`
        }
    }
}
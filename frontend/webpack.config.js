/* eslint-disable @typescript-eslint/no-var-requires */
const prod = process.env.NODE_ENV === "production";

const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCSSExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");

module.exports = {
    mode: prod ? "production" : "development",
    entry: path.join(process.cwd(), "src", "index.tsx"),
    output: {
        path: path.join(process.cwd(), "build"),
        filename: "bundle.js",
    },
    module: {
        rules: [
            {
                test: /\.(ts|js)x$/i,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "babel-loader",
                    },
                ],
            },
            {
                test: /\.(ts)$/i,
                exclude: /node_modules/,
                use: "ts-loader",
            },
            {
                test: /\.css$/i,
                use: [MiniCSSExtractPlugin.loader, "css-loader"],
            },
            {
                test: /\.(png|jpg|gif)$/i,
                use: "url-loader",
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".jsx", ".js"],
    },
    devtool: prod ? undefined : "source-map",
    plugins: [
        new HtmlWebpackPlugin({
            template: "public/index.html",
        }),
        new MiniCSSExtractPlugin(),
    ],
};

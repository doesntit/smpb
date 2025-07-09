export default `html {
  font-family: Fira Code,Monaco,Consolas,Ubuntu Mono,PingFang SC,Hiragino Sans GB,Microsoft YaHei,WenQuanYi Micro Hei,monospace,sans-serif;;
  font-size: 1em;
}

body {
  max-width: 72em;
  margin: 0 auto;
  padding: 1em;
  line-height: 1.6em;
}

h1 {
  text-align: center;
}

img {
  max-width: 60%;
  background-color: #fff;
}

p > img {
  margin: 1em auto;
  display: block;
}

/* 默认是明亮模式的样式 */
body {
  background-color: white;
  color: black;
}

/* 当系统处于暗黑模式时，应用以下样式 */
@media (prefers-color-scheme: dark) {
  body {
      background-color: #282828;
      color: #eaeaea;
  }
}

nav {
  margin-bottom: 1em;
}

nav span {
  margin-right: 1em;
}

nav span a {
  padding: 0.5em;
  color: #007bff;
  text-decoration: underline;
  cursor: pointer;
}

nav span a:visited {
  color: grey;
}

nav span::before {
  content: '[';
}

nav span::after {
  content: ']';
}

article {
  margin-bottom: 1em;
}

article > a {
  display: block;
}

pre {
  background: #2d2d2d;
  color: #ccc;
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.5;
}

code {
  font-family: Consolas, Monaco, "Fira Code", monospace;
  background-color: #2d2d2d;
  color: #ccc;
}

`;

# 📦 smpb

A simple blog generator to generate static websites

## ✨ Features

- 🚀 Convert markdown files to html
- 📂 Publish static html files to server's website static folder
- ⚙️ Simple

## 📦 Installation

Install globally using npm or yarn:

```bash
npm install -g smpb
# or
yarn global add smpb
```

Or use `npx` without installing:

```bash
npx smpb
```

## 🛠 Usage

Change directory to markdown files folder:
```bash
smpb [options]
```

### Examples

```bash
cd blog
smpb build
cd .html
```

### Available Options

| Option           | Description         |
|------------------|---------------------|
| build            | Convert all markdown files to html at the current directory |
| publish          | Todo: Publish to server static website |
| `-v, --version`  | Show version        |
| `-h, --help`     | Show help           |

## 📁 Project Structure

```
.
├── cli/
│   └── index.js       # CLI entry file
├── package.json
└── README.md
```

## 🧑‍💻 Development

Clone the repo and install dependencies:

```bash
git clone https://github.com/doesntit/smpb.git
cd smpb
npm install
```

Run the CLI:

```bash
node cli/index.js [options]
```

## 📄 License

MIT License © Alec Liu

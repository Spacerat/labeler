import * as React from "react";
import "./App.css";
import _ from "lodash";

type Words = Array<string>;

type WordMapping = { [key: string]: Words };

function capitalise(s: string): string {
  return s.replace(/\b\w/g, l => l.toUpperCase());
}

function words_to_string(categories: Words): string {
  return categories.join("\n");
}

function string_to_words(str: string): Words {
  return str.split("\n");
}

function mapping_to_csv(mapping: WordMapping): string {
  const pairs = _.flatten(
    _.map(mapping, (words, category) =>
      _.map(words, word => `${word},${category}`)
    )
  );

  const result = pairs.join("\n");
  return result.endsWith(",") ? result : result + "\n";
}

function csv_to_mapping(csv: string): WordMapping {
  const split = csv.split("\n");
  return _(split)
    .filter()
    .map(line => line.split(","))
    .fromPairs()
    .mapValues((x: string) => (_.isUndefined(x) ? "" : x))
    .invertBy()
    .value();
}

type AppState = {
  categories: Words;
  words: Words;
  mapping: WordMapping;
};

class App extends React.Component<{}, AppState> {
  constructor(props) {
    super(props);
    const saved = JSON.parse(localStorage.getItem("state"));

    this.state = saved
      ? saved
      : {
          categories: [],
          words: [],
          mapping: {}
        };
  }
  render() {
    const { categories, words, mapping } = this.state;
    return (
      <div className="App">
        <div>
          <h1> Labeler </h1>
          <h2> A rapid text categorisation tool </h2>
        </div>
        <hr />
        <div className="boxcolumns separated">
          <div className="boxcol">
            <h3>
              Enter one <span className="emph">word</span> per line
            </h3>
            <ListBox
              categories={words}
              onChange={v => this.setState({ words: v })}
            />
          </div>
          <div className="boxcol">
            <h3>
              Enter one <span className="emph">category</span> per line
            </h3>
            <ListBox
              categories={categories}
              onChange={v => this.setCategories(v)}
            />
          </div>
        </div>
        <div className="mainbox">
          <div className="separated panel">
            <Categoriser
              words={words}
              categories={categories}
              mapping={mapping}
              categorise={(word, cat) => this.categorise(word, cat)}
            />
          </div>
        </div>
        <div className="boxcolumns separated">
          <div className="boxcol centered">
            <h3>Output as JSON</h3>
            <JSONMappingBox
              mapping={mapping}
              onChange={v => this.setMapping(v)}
            />
          </div>
          <div className="boxcol centered">
            <h3>Output as CSV</h3>
            <CSVMappingBox
              mapping={mapping}
              onChange={v => this.setMapping(v)}
            />
          </div>
        </div>
        <div className="separated">
          <h3>Category counts </h3>
          <CategoryCounter mapping={mapping} />
        </div>
      </div>
    );
  }

  componentDidUpdate(_prevProps, _prevState) {
    localStorage.setItem("state", JSON.stringify(this.state));
  }

  setMapping(v: WordMapping) {
    const mapwords = _.filter(_.flatten(_.values(v)));

    this.setState({
      categories: _.keys(v),
      mapping: v,
      words: _.uniq(this.state.words.concat(mapwords))
    });
  }

  categorise(word: string, cat: string) {
    const mapping = this.state.mapping;
    mapping[cat].push(word);
    this.setState({ mapping: mapping });
  }

  setCategories(v: Words) {
    const newmapping = {};
    const mapping = this.state.mapping;
    for (const cat of v) {
      if (cat !== "") {
        newmapping[cat] = _.isArray(mapping[cat]) ? mapping[cat] : [];
      }
    }
    this.setState({
      categories: v,
      mapping: newmapping
    });
  }
}

class ListBox extends React.Component<{
  categories: Words;
  onChange: (words: Words) => void;
}> {
  render() {
    const joined = words_to_string(this.props.categories);
    return (
      <textarea
        rows={10}
        value={joined}
        onChange={e => this.props.onChange(string_to_words(e.target.value))}
      />
    );
  }
}

class JSONMappingBox extends React.Component<
  { mapping: WordMapping; onChange: (mapping: WordMapping) => void },
  { badtext: string }
> {
  constructor(props) {
    super(props);
    this.state = {
      badtext: ""
    };
  }

  render() {
    const val = JSON.stringify(
      this.props.mapping,
      Object.keys(this.props.mapping).sort(),
      "\t"
    );
    return !!this.state.badtext ? (
      <textarea
        className="badbox"
        rows={10}
        value={this.state.badtext}
        onChange={e => this.onChange(e.target.value)}
      />
    ) : (
      <textarea
        rows={10}
        value={val}
        onChange={e => this.onChange(e.target.value)}
      />
    );
  }

  onChange(v: string) {
    try {
      const out = JSON.parse(v);
      this.props.onChange(out);
      this.setState({ badtext: "" });
    } catch (e) {
      this.setState({ badtext: v });
    }
  }
}

class CSVMappingBox extends React.Component<{
  mapping: WordMapping;
  onChange: (mapping: WordMapping) => void;
}> {
  constructor(props) {
    super(props);
    this.state = {
      badtext: ""
    };
  }

  render() {
    const val = mapping_to_csv(this.props.mapping);
    return (
      <textarea
        rows={10}
        value={val}
        onChange={e => this.onChange(e.target.value)}
      />
    );
  }

  onChange(v: string) {
    const out = csv_to_mapping(v);
    this.props.onChange(out);
  }
}

class Categoriser extends React.Component<
  AppState & { categorise: (word: string, category: string) => void }
> {
  render() {
    const done = _.keyBy(_.flatten(_.values(this.props.mapping)));
    const words = _.filter(this.props.words, w => w && !done[w]).sort();
    const currentword = words[0];
    const nextwords = words.slice(1);
    const categories = _.filter(this.props.categories).sort();
    const categoryButtons = categories.map((cat, i) => (
      <Category
        key={cat}
        name={cat}
        letter={String.fromCharCode(i + "a".charCodeAt(0))}
        onClick={() => this.props.categorise(currentword, cat)}
      />
    ));

    return (
      <div
        className="categories"
        tabIndex={0}
        onKeyDown={e => this.onKeyDown(currentword, e)}
      >
        <h3 className="instruction">Click to start categorising!</h3>
        {currentword ? (
          <div>
            <div>
              What is <span className="currentWord">{currentword}</span>?
            </div>
            <div className="buttons">{categoryButtons}</div>
            <hr />

            {nextwords.length > 0 ? (
              <React.Fragment>
                {"Next words: "} <WordDisplay words={nextwords} />
              </React.Fragment>
            ) : null}
          </div>
        ) : (
          <span>Everything is in its place.</span>
        )}
      </div>
    );
  }

  onKeyDown(currentword: string, e: React.KeyboardEvent) {
    const categories = _.filter(this.props.categories).sort();
    const n = e.key.charCodeAt(0) - "a".charCodeAt(0);
    if (n >= 0 && n < categories.length) {
      this.props.categorise(currentword, categories[n]);
    }
  }
}

class CategoryCounter extends React.Component<{ mapping: WordMapping }> {
  render() {
    const counts = _.sortBy(
      _.map(this.props.mapping, (v, k) => ({
        name: k,
        num: v.length,
        sortby: -v.length
      })),
      "sortby"
    );
    const divs = counts.map(cat => (
      <div className="row" key={cat.name}>
        <span>{capitalise(cat.name)}</span> <span>{cat.num}</span>
      </div>
    ));

    return <div className="mainbox counter">{divs}</div>;
  }
}

class Category extends React.Component<{
  name: string;
  letter: string;
  onClick: (name: string) => void;
}> {
  render() {
    return (
      <div>
        <button
          className="category"
          onClick={() => this.props.onClick(this.props.name)}
        >
          <span className="letter">({this.props.letter})</span>{" "}
          {capitalise(this.props.name)}
        </button>
      </div>
    );
  }
}

class WordDisplay extends React.Component<{ words: Words }> {
  render() {
    const words = this.props.words;
    const more = words.length > 5 ? `... (${words.length - 5} more)` : null;
    return (
      <span>
        {_.map(words)
          .slice(0, 5)
          .join(", ")}
        <i>{more}</i>
      </span>
    );
  }
}

export default App;

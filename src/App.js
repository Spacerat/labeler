import React, { Component } from 'react';
import './App.css';
import _ from 'lodash'

function capitalise(s) {
  return s.replace(/\b\w/g, l => l.toUpperCase())
}

function words_to_string(categories) {
  return categories.join("\n")
}

function string_to_words(str) {
  return str.split("\n")
}

class App extends Component {
  constructor(props) {
    super(props)
    let saved = JSON.parse(localStorage.getItem('state'))

    this.state = saved ? saved : {
      categories: [],
      words: [],
      mapping: {}
    }
  }
  render() {
    let {categories, words, mapping} = this.state
    return (
      <div className="App">
        <div className="boxcolumns separated">
          <div className="boxcol">
            <h3>Categories</h3>
            <ListBox categories={categories} onChange={(v) => this.setCategories(v)} />
          </div>
          <div className="boxcol">
            <h3>Words</h3>
            <ListBox categories={words} onChange={(v) => this.setState({ words: v })} />
          </div>
          <div className="boxcol">
            <h3>Mapping</h3>
            <MappingBox mapping={mapping} onChange={(v) => this.setMapping(v)} />
          </div>
        </div>
        <div className="mainbox">
          <div className="separated panel">
            <Categorizer words={words} categories={categories} mapping={mapping} categorise={(word, cat) => this.categorise(word, cat)} />
          </div>
          <div className="separated">
           <CategoryCounter mapping={mapping} />
          </div>
        </div>
      </div>
    );
  }

  componentDidUpdate(prevProps, prevState) {
    localStorage.setItem('state', JSON.stringify(this.state))
  }

  setMapping(v) {
    let mapwords = _.filter(_.flatten(_.values(v)))

    this.setState({
      categories: _.keys(v),
      mapping: v,
      words: _.uniq(this.state.words.concat(mapwords))
    })
  }

  categorise(word, cat) {
    let mapping = this.state.mapping
    mapping[cat].push(word)
    this.setState({ mapping: mapping })
  }

  setCategories(v) {
    let newmapping = {}
    let mapping = this.state.mapping
    for (let cat of v) {
      if (cat !== "") {
        newmapping[cat] = _.isArray(mapping[cat]) ? mapping[cat] : []
      }
    }
    this.setState({
      categories: v,
      mapping: newmapping
    })
  }
}


class ListBox extends Component {
  render() {
    let joined = words_to_string(this.props.categories)
    return (
      <textarea rows="10" value={joined} onChange={(e) => this.props.onChange(string_to_words(e.target.value))}></textarea>
    )
  }
}

class MappingBox extends Component {
  constructor(props) {
    super(props)
    this.state = {
      badtext: ""
    }
  }
  render() {
    let val = JSON.stringify(this.props.mapping, Object.keys(this.props.mapping).sort(), '\t')
    return (
      (!!this.state.badtext ? <textarea className="badbox" rows="10" value={this.state.badtext} onChange={(e) => this.onChange(e.target.value)}></textarea>
        : <textarea rows="10" value={val} onChange={(e) => this.onChange(e.target.value)}></textarea>)
    )
  }

  onChange(v) {
    try {
      let out = JSON.parse(v);
      this.props.onChange(out)
      this.setState({ badtext: "" })
    }
    catch (e) {
      this.setState({ badtext: v })
    }

  }
}

class Categorizer extends Component {
  render() {
    let done = _.keyBy(_.flatten(_.values(this.props.mapping)))
    let words = _.filter(this.props.words, (w) => w && !done[w]).sort()
    let currentword = words[0]
    let nextwords = words.slice(1)
    let categories = _.filter(this.props.categories).sort()
    let categoryButtons = categories.map((cat, i) => (
      <Category key={cat} name={cat} letter={String.fromCharCode(i+'a'.charCodeAt(0))} onClick={() => this.props.categorise(currentword, cat)} />
    ))

    return <div className="categories" tabIndex="0" onKeyDown={(e)=>this.onKeyDown(currentword, e)}>
      {currentword ? (<div>
        <div>What is <b>{currentword}</b>?</div>
        <div className="buttons">
          {categoryButtons}
        </div>
        {nextwords.length > 0 ? <WordDisplay currentword={currentword} words={nextwords} /> : null}
      </div>) : <span>Everything is in its place.</span>}
    </div>
  }

  onKeyDown(currentword, e) {
    let categories = _.filter(this.props.categories).sort()
    let n = e.key.charCodeAt(0)-'a'.charCodeAt(0)
    if (n >=0  && n < categories.length) {
      this.props.categorise(currentword, categories[n])
    }
  }
}

class CategoryCounter extends Component {
  render() {
    let counts = _.sortBy(_.map(this.props.mapping, (v, k)=>({name: k, num: v.length, sortby: -v.length})), "sortby")
    let divs = counts.map((cat)=><div className="row" key={cat.name}><span>{capitalise(cat.name)}</span> <span>{cat.num}</span></div>)
    
    return <div className="mainbox counter">
        {divs}
      </div>
  }
}

class Category extends Component {
  render() {
    return (
      <div>
        <button className="category" onClick={() => this.props.onClick(this.props.name)}>
          <span className="letter">({this.props.letter})</span> {capitalise(this.props.name)}
        </button>
      </div>
      )
  }
}

class WordDisplay extends Component {
  render() {
    let words = this.props.words
    let more = words.length > 5 ? `... (${words.length - 5} more)` : null
    return <div>Next words: {_.map(words).slice(0, 5).join(", ")}<i>{more}</i></div>
  }
}

export default App;

// @flow
'use strict'

var _ = require('lodash')

class RandomSelection {
  array: Array<any>
  constructor (array: Array<any>) {
    this.array = array
  }
}

type PlayerScore = { [key: any]: number }

class Node {
  game: Game
  mcts: MCTS
  parent: ?Node
  move: any
  wins: PlayerScore
  visits: number
  children: ?Array<Node>
  depth: number
  randomNode: boolean
  constructor (game: Game, parent: ?Node, move, depth: number, mcts: MCTS) {
    this.game = game
    this.mcts = mcts
    this.parent = parent
    this.move = move
    this.wins = {}
    this.visits = 0
    this.children = null
    this.depth = depth || 0
    this.randomNode = false
  }

  getUCB1 (player: any) {
    let scorePerVisit: number = 0
    // always visit unvisited nodes first
    if (this.visits == 0) return Infinity;
    if (!this.parent) {
      return 0
    }
    scorePerVisit = (this.wins[player] || 0) / this.visits
    // See https://en.wikipedia.org/wiki/Monte_Carlo_tree_search#Exploration_and_exploitation
    return scorePerVisit + Math.sqrt(2 * Math.log(this.parent.visits) / this.visits)
  }

  getChildren () {
    if (this.children === null) {
      if (this.move !== null) {
        this.game.performMove(this.move)
      }
      var moves = this.game.getPossibleMoves()
      if (moves instanceof RandomSelection) {
        moves = moves.array
        this.randomNode = true
      }
      this.children = _.map(moves, function (move) {
        return new Node(_.assign(new this.game.constructor(), _.cloneDeep(this.game)), this, move, this.depth + 1, this.mcts)
      }, this)
    }
    return this.children
  }

  getWinner () {
    // forces the move to be performed
    this.getChildren()
    return this.game.getWinner()
  }

  nextMove () {
    // shuffle because sortBy is a stable sort but we want equal nodes to be chosen randomly
    if (this.randomNode) {
      return _(this.getChildren()).shuffle().last()
    }
    return _(this.getChildren()).shuffle().sortBy(this.mcts.nodeSort).last()
  }
}



class MCTS {
  game: any
  rounds: number
  player: any
  nodeSort: (node: Node) => number
  rootNode: Node
  constructor (game: Game, rounds: ?number, player: ?any) {
    var self = this
    this.game = game
    this.nodeSort = function (node: Node) {
      if (node.parent)
        return node.getUCB1(node.parent.game.getCurrentPlayer())
      return 0
    }
    this.rounds = rounds || 1000
    this.player = player || 0
    this.rootNode = new Node(game, null, null, 0, this)
  }

  selectMove () {
    let round, currentNode
    for (round = 0; round < this.rounds; round += 1) {
      currentNode = this.rootNode
      this.rootNode.visits += 1
      while (!_.isEmpty(currentNode.getChildren())) {
        currentNode = currentNode.nextMove()
        currentNode.visits += 1
      }
      let winner = currentNode.getWinner()
      while (currentNode) {
        currentNode.wins[winner] = (currentNode.wins[winner] || 0) + 1
        currentNode = currentNode.parent
      }
    }
    return _(this.rootNode.getChildren()).sortBy('visits').last().move
  }
}

interface Game {
  getPossibleMoves (): Array<any> | RandomSelection;
  performMove (move: any): void;
  getCurrentPlayer (): any;
  getWinner (): any;
}

exports.MCTS = MCTS
exports.RandomSelection = RandomSelection

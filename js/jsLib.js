class TrelloBoard {
  constructor(key, token, board_id) {
    this.key = key;
    this.token = token;
    this.boardID = board_id;

    this.checkCredentals();
  }

  async checkCredentals() {
    let resp = await fetch(`https://api.trello.com/1/boards/${this.boardID}/?key=${this.key}&token=${this.token}`);
    if (resp.ok) {
      return {status: 'success'};
    } else if (resp.status === 401) {
      throw 'INVALID CREDENTIALS';
    } else if (resp.status === 404) {
      throw 'METHOD NOT FOUND';
    } else {
      throw 'UNEXPECTED ERROR';
    }
  }

  async getLists() {
    let resp = await fetch(`https://api.trello.com/1/boards/${this.boardID}/lists/?key=${this.key}&token=${this.token}`);
    if (resp.ok) {
      let json = (await resp.json());
      let out = [];
      json.forEach(item => {
        let obj = {
          id: item.id,
          title: item.name
        };
        out.push(obj);
      });
      return out;
    } else {
      throw 'SOMETHING WENT WRONG';
    }
  }

  async getListCards(list_id, checklists = false) {
    let resp = await fetch(`https://api.trello.com/1/lists/${list_id}/cards/?key=${this.key}&token=${this.token}`);
    if (resp.ok) {
      let json = await resp.json();
      let out = [];
      for (const item of json) {
        let obj = {
          id: item.id,
          list_id: list_id,
          title: item.name,
          description: item.desc,
          due: null,
          checklists: []
        };

        if (item.due !== null) {
          let date = item.due.split('.')[0];
          let date_time = date.split('T');
          let date_parts = date_time[0].split('-');
          let time_parts = date_time[1].split(':');
          date = new Date(Number(date_parts[0]), Number(date_parts[1]) - 1, Number(date_parts[2]), Number(time_parts[0]), Number(time_parts[1]), Number(time_parts[2]));

          obj.due = date.getTime() / 1000;
        }

        if (!checklists) {
          obj.checklists = item.idChecklists;
        } else {
          for (const id of item.idChecklists) {
            let checklist = await this.getChecklist(id);
            obj.checklists.push(checklist);
          }
        }

        out.push(obj);
      }
      return out;
    } else {
      throw 'SOMETHING WENT WRONG';
    }
  }

  async getChecklist(checklist_id) {
    let resp = await fetch(`https://api.trello.com/1/checklists/${checklist_id}/?key=${this.key}&token=${this.token}`);
    if (resp.ok) {
      let json = await resp.json();
      let obj = {
        id: json.id,
        title: json.name,
        items: []
      };
      json.checkItems.forEach(item => {
        let item_obj = {
          id: item.id,
          title: item.name,
          state: item.state
        };
        obj.items.push(item_obj);
      });
      return obj;
    } else {
      throw 'SOMETHING WENT WRONG';
    }
  }
  async getCardsByDate(date, checklists = false, lists = null) {
    if (lists === null) {
      lists = await this.getLists();
    }
    let startDate = (new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)).getTime() / 1000;
    let endDate = startDate + 24 * 3600 - 1;
    let cards = [];
    let cardsNull = [];
    for (const list of lists) {
      let listCards = await this.getListCards(list.id, checklists);
      listCards.forEach(item => {
        if (item.due === null) {
          cardsNull.push(item);
        } else if (item.due >= startDate && item.due <= endDate) {
          cards.push(item);
        }
      });
    }
    cardsNull.forEach(item => cards.push(item));
    return cards;
  }

  async moveCard(card, to_list) {
    let resp = await fetch(`https://api.trello.com/1/cards/${card.id}/?key=${this.key}&token=${this.token}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idList: to_list.id
      })
    });
    if (resp.ok) {
      return {status: 'success'};
    } else {
      throw 'SOMETHING WENT WRONG';
    }
  }
}
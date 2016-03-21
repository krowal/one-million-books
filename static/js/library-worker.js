/**
 * books-worker
 * @module books-worker
 * @author lukaszkowalski
 */

/**
 * Tool used to make simple words
 * from given parts, just to create content
 */
var WordGenerator = new (function(){
    var parts = [
        'and', 'arn', 'apu', 'aro', 'ure', 'ewo',
        'mon', 'zach', 'rat', 'tran', 'gun', 'zich',
        'ten', 'lex', 'lof', 'ban', 'pov', 'gor',
        'ben', 'wok', 'man', 'gan', 'ren', 'trow',
        'quin', 'quan', 'quon', 'ren'
    ];

    this.word = function(parts_amount){
        var word = '';
        while(parts_amount--){
            word += parts[Math.round(Math.random() * (parts.length - 1))]
        }
        word = word.charAt(0).toUpperCase() + word.substr(1);
        return word;
    };

    this.sentence = function(words_amount){
        var words = [];
        while(words_amount--){
            words.push(this.word(1 + Math.round(Math.random() * 2)));
        }
        return words.join(" ");
    };

    this.timestamp = function(){
        return 1 + Math.round((Math.random() * Date.now()));
    }
})();

var Library = new (function(){
    var order = {
            field:null,
            type:null //0-asc, 1-desc
        },
        genre_filter = null,
        books = [],
        active_seek_index = 0,
        response = function(type, payload){
            postMessage({response:type, payload:payload});
        };

    this.startBooksFactory = function(required_amount){
        var counter = 0,
            id = 0;

        while(true){
            counter++;
            books.push({
                id:id++,
                title:WordGenerator.sentence(Math.round(Math.random() + 2)),
                date:WordGenerator.timestamp(),
                genre: Math.round((Math.random() * 4)), //0-4
                author:{
                    name:WordGenerator.word(2) + ' ' + WordGenerator.word(2),
                    gender: Math.round(Math.random())
                }
            });

            if(counter >= 50){
                response("books.amount", books.length);
                counter = 0;
            }

            if(books.length >= required_amount){
                response("books.amount", books.length);
                response("library.factory.finished");
                break;
            }
        }
    };

    this.sort = function(field, type){
        active_seek_index = 0;

        if(order.field == field){
            order.type = type;
            books.reverse();
            return response("library.status", "ready");
        }

        order.field = field;
        order.type = type;

        switch(order.field){
            case 'title':
                books.sort(function(a, b){
                    return a.title < b.title ? -1 : (a.title > b.title ? 1 : 0);
                });
                break;

            case 'author':
                books.sort(function(a, b){
                    return a.author.name < b.author.name ? -1 : (a.author.name > b.author.name ? 1 : 0);
                });
                break;

            case 'date':
                books.sort(function(a, b){
                    return a.date - b.date;
                });
                break;
        }

        response("library.status", "ready");
    };

    this.setGenreFilter = function(genre){
        genre_filter = genre;
        active_seek_index = 0;

        response("library.status", "ready");
    };

    this.fetchNextPage = function(limit){
        limit = !!limit ? limit : 20;

        var buffer = [];
        while(active_seek_index < books.length && buffer.length < limit){
            var book = books[active_seek_index];

            if(genre_filter !== null){
                if(book.genre == genre_filter) buffer.push(book);
            }else{
                buffer.push(book);
            }

            active_seek_index++;
        }

        response("library.page", buffer);
    };
})();

onmessage = function(message){
    var info = message.data;

    switch(info.cmd){
        case 'library.init':
            Library.startBooksFactory(info.content);
            break;

        case 'library.sort':
            Library.sort(info.content.field, info.content.type);
            break;

        case 'library.nextPage':
            Library.fetchNextPage(!!info.content ? info.content : 20);
            break;

        case 'library.genre_filter':
            Library.setGenreFilter(info.content);
            break;
    }
};
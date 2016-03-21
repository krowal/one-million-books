var LibraryApp = angular.module('LibraryApp', []);

LibraryApp.controller('LibraryCtrl', function ($scope, LibraryService) {
    var scroll_request_lock = false;

    $scope.books            = [];
    $scope.books_amount     = 0;
    $scope.library_status   = null;

    $scope.available_genres = [
        "Criminal",
        "Comedy",
        "Drama",
        "Horror",
        "Finance"
    ];

    $scope.available_genders = [
        "Male",
        "Female"
    ];

    $scope.selected_genre = null;

    $scope.sorting = {
        fields:[
            {
                key:'title',
                name:'Title'
            },{
                key:'author',
                name:'Author name'
            },{
                key:'date',
                name:'Date'
            }
        ],
        active:{
            field:null,
            type:null //0 - asc, 1 - desc
        }
    };

    $scope.start = function(){
        LibraryService.request('library.init', 1000000);
    };

    $scope.getSelectedGenreName = function(){
        return $scope.selected_genre == null ? "All" : $scope.available_genres[$scope.selected_genre];
    };

    $scope.getSortingType = function(){
        var type = $scope.sorting.type;
        return type === null ? '' : type ? 'Asc.' : 'Desc.';
    };

    $scope.selectGenre = function(genre){
        if($scope.genre == genre || $scope.library_status != 'ready'){
            return false;
        }

        $scope.library_status = 'sorting';

        $scope.selected_genre = genre;
        LibraryService.request("library.genre_filter", genre);
    };

    $scope.toggleSort = function(field){
        if($scope.library_status != 'ready'){
            return false;
        }

        $scope.library_status = 'sorting';

        if($scope.sorting.active.field == field){
            $scope.sorting.active.type = $scope.sorting.active.type == 1 ? 0 : 1;
        }else{
            $scope.sorting.active = {
                field:field,
                type:0
            }
        }

        LibraryService.request("library.sort", $scope.sorting.active);
        if (!$scope.$$phase) $scope.$apply();
    };

    $scope.$on('LibraryWorkerEvent', function(event, data){
        switch(data.response){
            case 'books.amount':
                $scope.books_amount = data.payload;
                break;

            case 'library.factory.finished':
                $scope.library_status = "ready";
                getNextPage();
                break;

            case 'library.page':
                for(var i in data.payload) $scope.books.push(data.payload[i]);
                scroll_request_lock = false;
                break;

            case 'library.status':
                $scope.books = [];
                getNextPage();
                $scope.library_status = "ready";
                break;
        }

        if (!$scope.$$phase) $scope.$apply();
    });

    var getNextPage = function(){
        LibraryService.request("library.nextPage", 20);
    };

    window.onscroll = function(){
        if(scroll_request_lock) return;

        var body = document.body,
            html = document.documentElement,

            //workaround to natively determine document height in various browsers
            height = Math.max(
                body.scrollHeight, body.offsetHeight,
                html.clientHeight, html.scrollHeight, html.offsetHeight
            );

        var trigger_at = height - window.outerHeight - 200;

        if(window.scrollY > trigger_at){
            scroll_request_lock = true;
            getNextPage();
        }
    }
});

/**
 * Service used for communication between worker
 * and frontend application
 */
LibraryApp.service("LibraryService", function($rootScope){
    var w = new Worker("static/js/library-worker.js");
    w.onmessage = function(message){
        $rootScope.$broadcast('LibraryWorkerEvent', message.data);
    }.bind(this);

    this.request = function(cmd, data){
        data = typeof(data) != 'undefined' ? data : {};

        w.postMessage({
            cmd:cmd,
            content:data
        });
    };
});
var db = require( "../db" );
var Tweet = require( "../../model/tweet" );
var Receipt = require( "../../model/receipt" );
var Store = require( "../../model/store" );
var storeController = require( "../../controller/store" );

db.connect().then(() => {

	// do geolocate
	Receipt.find( {}, ( error, receipts ) => {

		if ( error )
			throw error;

		if ( ! receipts.length )
			throw new Error( "No Receipts found." );

//		let remaining_receipts = receipts.length;

		receipts.forEach( ( receipt ) => {

			if ( ! receipt.tweet ) {
				console.log( "No tweet id, skipping receipt" );
				return;
			}

			Tweet.findById( receipt.tweet, ( error, tweet ) => {

				if ( error )
					throw error;

				if ( ! tweet ) {
					console.log( "Tweet not found" );
					return;
				}

				if ( ! tweet.data.coordinates ) {
					console.log( "Tweet has no coordinates" );
					return;
				}

				storeController.findStoreNearCoords( tweet.data.coordinates.coordinates[1], tweet.data.coordinates.coordinates[0] )
					.then( ( store ) => {

						if ( ! store ) {
							console.log( "Store not found" );
							return;
						}

						console.log( "store found >> ", store );
						receipt.store = store._id;
						receipt.save( ( error ) => {
							if ( error )
								throw error;
						});
					//	if ( --remaining_tweets === 0 )
					//		db.close();
					})
					.catch( ( error ) => {
						throw error;
					});


			});
		});
	});


	// do #storeXXX tweets
	Tweet.find( { "data.text": /#store\d+/ }, ( error, tweets ) => {

		if ( error )
			throw error;

		if ( ! tweets.length )
			throw new Error( "No Tweets found." );

		tweets.forEach( ( tweet ) => {

			if ( ! tweet.receipt ) {
				console.log( "No receipt id, skipping tweet" );
				return;
			}

			Receipt.findOne( { tweet: tweet._id }, ( error, receipt ) => {

				if ( error )
					throw error;

				if ( ! receipt ) {
					console.log( "Receipt not found" );
					return;
				}

				let matches = tweet.data.text.match( /#store(\d+)/ );
				if ( ! matches ) {
					console.log( "Tweet has no store hashtag" );
					return;
				}

				Store.findOne( { number: matches[1] }, ( error, store ) => {

					if ( error )
						throw error;

					if ( ! store ) {
						console.log( "Store not found" );
						return;
					}

					receipt.store = store._id;
					receipt.save( ( error ) => {
						if ( error )
							throw error;
					});
				});
			});
		});
	});

}).catch( ( error ) => {
	throw error;
});
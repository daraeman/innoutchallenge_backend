const User = require( "../model/user" );
const Receipt = require( "../model/receipt" );
const Store = require( "../model/store" );
const userController = require( "./user" );
const ObjectId = require( "mongoose" ).Types.ObjectId;

exports.users_list = function( request, response ) {

	const amount = parseInt( request.body.amount );
	const page = parseInt( request.body.page );

	if ( ! amount )
		return response.status( 500 ).send( "Invalid amount" );
	if ( page < 0 || isNaN( page ) )
		return response.status( 500 ).send( "Invalid page" );

	const skip = ( ( page - 1 ) * amount );
	const limit = ( amount + 1 );

	User.find( { state: 1 }, [ "name", "totals" ], { skip: skip, limit: limit }, ( error, users ) => {

		if ( error )
			return response.status( 500 ).send( error );

		if ( ! users.length )
			return response.send( JSON.stringify( [] ) );
     
		const has_next_page = ( users.length === limit );

		users.splice( [ users.length - 1 ], 1 );

		const data = {
			users: users,
			currentPage: page,
			hasNextPage: has_next_page,
			hasPreviousPage: ( page > 1 ),
		};

		return response.send( JSON.stringify( data ) );

	}).sort({ "totals.receipts.unique": "desc" }).lean();

};

exports.user_instore_receipts = function( request, response ) {

	const name = request.body.name;

	if ( ! name )
		return response.status( 500 ).send( "Invalid name" );

	userController.searchUser( name ).then( ( user ) => {

		Receipt.find( { user: new ObjectId( user._id ), type: 1, approved: 1 }, ( error, receipts ) => {

			if ( error )
				return response.status( 500 ).send( error );

			let receipts_list = {};
			for ( let i = 1; i <= 99; i++ ) {
				if ( i !== 69 )
					receipts_list[ i ] = { amount: 0 };
			}

			receipts.forEach( ( receipt ) => {
				receipts_list[ receipt.number ].amount++;
			});

			user.receipts = receipts_list;

			return response.send( JSON.stringify( user ) );

		}).sort({ "data.created_at": "asc" }).lean();

	}).catch( ( error ) => {
		return response.status( 404 ).send( error );
	});
};

exports.user_stores = function( request, response ) {

	const name = request.body.name;

	if ( ! name )
		return response.status( 500 ).send( "Invalid name" );

	userController.searchUser( name ).then( ( user ) => {

		Store.find({ popup: { $exists: false } }, ( error, stores ) => {

			if ( error )
				throw error;

			if ( ! stores.length ) {
				console.log( "No Stores found" );
				return;
			}

			let stores_list = {};
			stores.forEach( ( store ) => {
				stores_list[ store._id ] = { amount: 0 };
			});

			Receipt.find( {
				user: new ObjectId( user._id ),
				approved: 1,
				store: { $ne: null },
				type: { $in: [ 1, 2, 3 ] }
			}, ( error, receipts ) => {

				if ( error )
					throw error;

				function getStore( id ) {
					let store = false;
					stores.some( ( temp_store ) => {
						console.log( temp_store._id +" == "+ id );
						if ( temp_store._id == id ) {
							store = temp_store;
							return true;
						}
					});
					return store;
				}

				receipts.forEach( ( receipt ) => {
					stores_list[ receipt.store ].amount++;
				});

				let final_stores = {};

				let keys = Object.keys( stores_list );
				keys.forEach( ( key ) => {
					let number = getStore( key ).number;
					console.log( number );
					final_stores[ number ] = stores_list[ key ];
				});
				user.stores = final_stores;

				return response.send( JSON.stringify( user ) );

			}).lean();

		}).lean();

	}).catch( ( error ) => {
		return response.status( 404 ).send( error );
	});
};

exports.user_drivethru_receipts = function( request, response ) {

	const name = request.body.name;

	if ( ! name )
		return response.status( 500 ).send( "Invalid name" );

	userController.searchUser( name )
		.then( ( user ) => {

			console.log( "user >> ", user )

			Receipt.find( { user: new ObjectId( user._id ), type: 3, approved: 1 }, [ "number" ], ( error, receipts ) => {

				if ( error )
					return response.status( 500 ).send( error );

				if ( ! receipts )
					receipts = [];

				user.drivethru = receipts;

				console.log( "user2 >> ", user )

				return response.send( JSON.stringify( user ) );

			});

		}).catch( ( error ) => {
			return response.status( 404 ).send( error );
		});

};
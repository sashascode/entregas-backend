import express from 'express';
import 'dotenv/config'
import passport from 'passport';
import cookieParser from 'cookie-parser';
import handlebars from 'express-handlebars';
import { Server } from 'socket.io';
import { __dirname } from './utils.js';
import bcrypt, { compareSync } from 'bcrypt';
import productsRouter from './routes/products.router.js';
import cartsRouter from './routes/carts.router.js';
import viewsRouter from './routes/views.router.js';
import userRouter from './routes/user.router.js';
import { ProductManager } from './dao/services/product.service.js';
import { MessageManager } from './dao/services/message.service.js';
import { CartManager } from './dao/services/cart.service.js';
import { UserManager } from './dao/services/user.service.js';
import { initializePassport } from './config/passport.config.js';

const productManager = new ProductManager();
const cartManager = new CartManager();
const messageManager = new MessageManager();
const userManager = new UserManager();
  
export const app = express();
app.engine("handlebars", handlebars.engine(
    {
        helpers: {
            range: function (count) { 
                const result = [];
                for (let i = 0; i < count; ++i) {
                    result.push(i+1);
                }
                return result;
            },
            eq: function (a, b) { 
                return a == b; 
            },
            cl: function (v) { 
                console.log(v); 
            },
            getCartSubtotal: function (products) {
                let subtotal = 0;

                products.forEach(product => {
                    subtotal += product.id.price * product.quantity;
                });

                return subtotal;
            }
        }
    }
));

app.set('views', __dirname + '/views');
app.set('view engine', 'handlebars');

app.use(cookieParser());

initializePassport();
app.use(passport.initialize());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use('/views/', viewsRouter);
app.use('/api/products/', productsRouter);
app.use('/api/carts/', cartsRouter);
app.use('/api/users/', userRouter);

const httpServer = app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
const socketServer = new Server(httpServer);

export const createHash = async (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
}

export const compareHash = async (password, hash) => {
    return bcrypt.compareSync(password, hash);
}
// <--- Socket Connection --->

socketServer.on('connection', async socket => {
    console.log("New client connection");

    // <--- Product List sockets --->
    socket.on("onaddtocart", async (data) => {
        await cartManager.addProductToCart(data.cid, data.pid);
    });

    // <--- Real time products sockets --->
    socket.emit('products', await productManager.getProducts());

    socket.on("onaddproduct", async product => {
        await productManager.addProduct(product);
        const data = await productManager.getProducts();
        socketServer.sockets.emit('products', data);
    });

    socket.on("ondeleteproduct", async pid => {
        await productManager.deleteProduct(pid);
        const data = await productManager.getProducts();
        socketServer.sockets.emit('products', data);  
    });

    // <--- Chat sockets --->
    socket.emit('messages', await messageManager.getAllMessages());

    socket.on('new-message', async (message) => {
        await messageManager.saveMessage(message);
        let messages = await messageManager.getAllMessages();
        socketServer.sockets.emit('messages', messages);
    });
});
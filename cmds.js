const readline = require('readline');

const {models} = require('./model');
const {log,biglog,errorlog, colorize} = require('./out');

const Sequelize = require('sequelize');

const validateId = id =>{

  return new Sequelize.Promise((resolve, reject) => {
    if (typeof id === "undefined"){
      reject(new Error(`Falta el parametro <id>.`));
    }else{
      id=parseInt(id);
      if(Number.isNaN(id)){
        reject(new Error(`El valor del parametro <id> no es un numero.`));
      }else{
        resolve(id);
      }
    }
  })
}

const makeQuestion =(rl, text) => {
  return new Sequelize.Promise ((resolve, reject) => {
    rl.question(colorize(` ¿${text}? `, 'red'), answer => {
      resolve(answer.trim());
    });
  });
};

exports.helpCmd = rl => {
  log('Comandos:');
  log('   h|help - Muestra esta ayuda.');
  log('   show <id> - Muestra la pregunta y la respuesta el quiz indicado.');
  log('   add - Añadir un nuevo quiz interactivamente.');
  log('   delete <id> - Borrar el quiz indicado.');
  log('   edit <id> - Editar el quiz indicado.');
  log('   test <id> - Probar el quiz indicado.');
  log('   p|play - Jugar a preguntar aleatoriamente todos los quizzes.');
  log('   credits - Créditos.');
  log('   q|quit - Quitar el programa.');
  rl.prompt();
}




exports.listCmd = rl => {

  models.quiz.findAll()
  .each(quiz => {
      log(`[${colorize(quiz.id, 'magenta')}]:  ¿${quiz.question}?`);
    })
  .catch(error =>{
    errorlog(error.message);
  })
  .then(()=>{
    rl.prompt();
  })
}

exports.quitCmd = rl => {
  rl.close();
  rl.prompt();
}
exports.showCmd = (rl,id) => {

  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if(!quiz){
      throw new Error (` No existe un quiz asociado al id=${id}.`);
    }
    log(`  [${colorize(quiz.id,'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });

};
exports.addCmd = rl => {

  makeQuestion(rl, 'Pregunta')
  .then(q => {
    return makeQuestion(rl, 'Respuesta')
    .then(a => {
      return {question: q, answer:a};
    });
  })
.then(quiz=>{
    return models.quiz.create(quiz);
})
.then((quiz) => {
    log(`${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize(' => ','magenta')} ${quiz.answer}`);
})
.catch(Sequelize.ValidationError, error => {
  errorlog ('El quiz es erroneo:');
  error.errors.forEach(({message}) => errorlog(message));
})
.catch(error => {
  errorlog(error.message);
})
.then(() => {
  rl.prompt();
});

};
exports.testCmd = (rl,id) => {
  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if (!quiz){
      throw new Error(` No existe un quiz asociado al id=${id}.`)
    }
    return new Promise((resolve, reject) => {


    makeQuestion(rl, quiz.question)
    .then(answer => {
      if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()){
        log('Su respuesta es correcta');
        biglog('Correcta', 'green');
        resolve()
      }else{
        log('Su respuesta es incorrecta');
        biglog('Incorrecta', 'red');
        resolve()
      }
    })
  })
})
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });

}


exports.playCmd = rl => {

  		let score = 0; 
  		let SinResponder = []; 

      for (i=0; i<models.quiz.count();i++){
        SinResponder[i]=i;
      }

  		const letsPlay = () => {
        return new Promise ((resolve, reject) => {
  				if(toBePlayed.length === 0) {
            log(' ¡No hay preguntas que responder!','yellow');
            log(' Fin del examen. Aciertos: ');
  					resolve();
  					return;
  				}
  				let pos = Math.floor(Math.random()*SinResponder.length);
  				let quiz = SinResponder[pos];
  		    SinResponder.splice(pos, 1); 
  		    makeQuestion(rl, quiz.question)
  		    .then(resp => {
            if(resp.toLowerCase().trim() === quiz.resp.toLowerCase().trim()){
              score++;
  				    log(` CORRECTO - Lleva ${score} aciertos`);
  				    resolve(letsPlay());
            }else{
              log('  INCORRECTO ');
              log(`  Fin del juego. Aciertos: ${score} `);
  				    resolve();
  			    }
  		    })
  	     })
  	  }
  		models.quiz.findAll({raw: true}) 
  		.then(quizzes => {
  			SinResponder= quizzes;
      })
  		.then(() => {
  		 	return letsPlay(); 
  		 })
  		.catch(e => {
  			errorlog("Error:" + e); 
  		})
  		.then(() => {
  			biglog(score, 'blue');
  			rl.prompt();
  		})
}


exports.deleteCmd = (rl,id) => {
validateId(id)
.then(id => models.quiz.destroy({where: {id}}))
.catch(error => {
  errorlog(error.message);
})
.then(() => {
  rl.prompt();
});
};


exports.editCmd = (rl,id) => {
  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if(!quiz){
      throw new Error(`No existe el parametro asociado ${id}.`);
    }

    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
    return makeQuestion(rl, ' Introduzca la pregunta: ')
    .then(q => {
        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
        return makeQuestion(rl, 'Introduzca la respuesta ')
        .then(a => {
          quiz.question =q;
          quiz.answer =a;
          return quiz;
        });
    });
  })
.then(quiz => {
  return quiz.save();
})
.then(quiz => {
  log (`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`)
})
.catch(Sequelize.ValidationError, error => {
  errorlog('El quiz es erroneo:');
  error.errors.forEach(({message}) => errorlog(message));
})
.catch(error => {
  errorlog(error.message);
})
.then(() => {
  rl.prompt();
});
}

exports.creditsCmd = rl => {
  log('Autores de la práctica:');
  log('DANIEL');
  log('DAVID');
  rl.prompt();
}

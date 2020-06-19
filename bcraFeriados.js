#!/usr/bin/node

const puppeteer = require('puppeteer')
const fs = require('fs')
const retry = require('async-retry')
const URL_BCRA = 'https://www.bcra.gob.ar/BCRAyVos/Herramientas_Feriados_Bancarios.asp'

const dataOutput = async () => {
    return new Promise(async function(resolve, reject) {
        try {
            let lenghtColumns = (await page.$$('body > div > div.contenido > div > div > div > table > tbody > tr')).length
            let columnData = await page.$$('body > div > div.contenido > div > div > div > table > tbody > tr')
            let arrayFeriados = []

            for (positionInColumns = 0; positionInColumns < lenghtColumns; positionInColumns++) {
                let dataDeFeriado = await page.evaluate(columnData => columnData.innerText, columnData[positionInColumns])
               dataDeFeriado  = dataDeFeriado.split(/\(([^)]+)\)/)
               let trimmedFeriado = dataDeFeriado[0].trim();
               arrayFeriados.push(trimmedFeriado)
            }
            
            resolve(arrayFeriados)
            logSuccessAndExit(arrayFeriados)
            browser.close()            
        } catch (err) {
            console.log(err)
            reject(err)
        }
    })
}
 

const processDataRequest = async () => {
    return new Promise(async function(resolve, reject) {
           try {
                await page.waitForSelector('div.clearfix.pagina-interior')
                try {
                    const result = await dataOutput()
                    resolve(result)
                } catch (err) {
                    reject(err.message)
                }
            }catch(err){
            //browser.close()
                console.log("No se encontro el selector")
                console.log(err)
                logErrorAndExit(true)
                throw new Error(err)
                
            }

                    
    })
}

const preparePage = async () => {
    browser = await puppeteer.launch({
         headless: true,
        //headless: true,
        args: [
            '--no-sandbox',
            '--disable-features=site-per-process',
            '--disable-gpu',
            '--window-size=1920x1080',
        ]
    })
    viewPort = {
        width: 1300,
        height: 900
    }


    page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36');
    await page.setViewport(viewPort)
    await page.setDefaultNavigationTimeout(20000)
    await page.setDefaultTimeout(20000)

    await page.goto(URL_BCRA, {
        waitUntil: 'networkidle0'
    })

}

const run = async () => {
    // preparo el navegador e ingreso al sistema
    await retry(async bail => {
        // if anything throws, we retry
        await preparePage()
    }, {
        retries: 5,
        onRetry: async err => {
            console.log(err)
            console.log('Retrying...')
            await page.close()
            await browser.close()
        }
    })

    try {
        
        const processResult = await processDataRequest()
        console.log(processResult)
        logSuccessAndExit(processResult)
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
}

const logErrorAndExit = async error => {
    //const resultChangeStatus = await updateJobResult(processParams.job_id, 'error', null, error)
    console.log(JSON.stringify({
        state: 'failure',
        data: error
    }))

    process.exit()
}

const logSuccessAndExit = async resultData => {
    //const resultChangeStatus = await updateJobResult(processParams.job_id, 'finished', resultData, null)
  	let buff = new Buffer(JSON.stringify(resultData))
		let base64data = buff.toString('base64')
  	
    console.log(JSON.stringify({
        state: 'success',
        data: [resultData]
    }))

    process.exit()
}
run().catch(logErrorAndExit)